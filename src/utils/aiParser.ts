import { TransactionType, Category, PaymentMethod } from '../models/types';
import { format, subDays } from 'date-fns';
import { supabase } from '../lib/supabaseClient';

export interface ParsedTransaction {
    type: TransactionType;
    description: string;
    amount: number | null;
    date: string;
    categoryId: string;
    paymentMethodId?: string;
    installments?: number | null;
    confidence: number;
    needs_review: boolean;
    reason: string;
    currency: "BRL";
}

// ── Deterministic Layer 1: Keywords & Rules ───────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'alimentacao': ["almoco", "almoço", "jantar", "lanche", "restaurante", "padaria", "cafe", "café", "ifood", "pizza", "hamburguer", "mc donalds", "bk", "burger king", "refeicao", "refeição"],
    'assinaturas': ["netflix", "amazon prime", "prime video", "globoplay", "youtube premium", "spotify", "icloud", "google one", "assinatura", "mensalidade"],
    'beleza e autocuidado': ["salao", "salão", "cabelo", "barbearia", "corte", "manicure", "pedicure", "unha", "sobrancelha", "skincare", "perfume", "maquiagem"],
    'cartão de credito': ["fatura", "anuidade", "rotativo", "juros do cartao", "nubank", "inter card", "mastercard", "visa", "itaucard", "santander card"],
    'casa e manutencao': ["conserto", "manutencao", "manutenção", "pedreiro", "pintor", "eletricista", "encanador", "material de construcao", "reforma", "obra"],
    'compras/mercado': ["mercado", "supermercado", "atacadao", "atacadão", "assai", "carrefour", "pao de acucar", "hortifruti", "feira", "acougue", "rancho"],
    'contas': ["internet", "wifi", "luz", "energia", "agua", "água", "gas", "gás", "telefone", "celular", "plano", "condominio", "aluguel"],
    'dividas/emprestimos': ["emprestimo", "empréstimo", "financiamento", "parcela", "divida", "dívida", "quitar", "juros"],
    'educacao e livros': ["escola", "colegio", "colégio", "faculdade", "curso", "mensalidade escolar", "idioma", "ingles", "inglês", "apostila", "livro"],
    'impostos e taxas': ["iptu", "ipva", "ir", "imposto", "darf", "das", "licenciamento", "detran", "multa", "taxa", "mei"],
    'investimentos': ["investi", "investimento", "aporte", "tesouro", "cdb", "lci", "lca", "acoes", "ações", "crypto", "bitcoin", "fii"],
    'lazer': ["cinema", "show", "teatro", "bar", "balada", "ingresso", "evento", "passeio", "parque", "cerveja", "chopp", "drink"],
    'pets e cuidado': ["pet", "pet shop", "petshop", "racao", "ração", "veterinario", "veterinário", "banho e tosa"],
    'presentes e doacoes': ["presente", "doacao", "doação", "dizimo", "dízimo", "igreja", "vaquinha", "mimo"],
    'saude': ["farmacia", "farmácia", "remedio", "remédio", "medico", "médico", "exame", "laboratorio", "dentista", "psicologo", "terapia", "hospital"],
    'seguros': ["seguro", "seguro do carro", "seguro residencial", "seguro de vida", "porto seguro", "ituran"],
    'tecnologia': ["celular", "iphone", "notebook", "computador", "pc", "monitor", "mouse", "teclado", "hardware", "eletronico"],
    'transporte/veículos': ["gasolina", "combustivel", "etanol", "alcool", "diesel", "posto", "abasteci", "uber", "99", "onibus", "metro", "oficina", "pneu"],
    'vestuarios': ["roupa", "camisa", "calca", "calça", "sapato", "tenis", "tênis", "vestido", "shopping", "moda"],
    'viagens': ["viagem", "hotel", "airbnb", "passagem", "voo", "aereo", "milhas", "hospedagem"]
};

const PAYMENT_KEYWORDS = {
    'pix': ["pix", "paguei no pix", "transferi no pix", "fiz pix"],
    'cartao  de debito': ["debito", "débito", "cartao debito", "cartão débito"],
    'cartao  de credito': ["credito", "crédito", "cartao credito", "cartão crédito"],
    'dinheiro': ["dinheiro", "em especie", "em espécie", "cash"],
    'boleto': ["boleto", "boleto bancario"],
    'transferencia': ["transferencia", "transferência", "ted", "doc"],
    'parcelado': ["parcelado", "parcelei", "em 2x", "em 3x", "2 vezes", "3 parcelas", "2x", "3x", "4x", "5x", "6x", "10x", "12x"]
};

// ── Normalization Utilities ──────────────────────────────────────────────────

function normalise(s: string): string {
    return s.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[.,!?;:]/g, ' ')
        .trim();
}

function parseAmount(text: string): number | null {
    const norm = normalise(text);
    // Detect "mil", "conto", etc.
    let workText = norm
        .replace(/\b(\d+)\s*mil\b/g, (_, n) => (parseInt(n) * 1000).toString())
        .replace(/\bconto(s)?\b/g, 'reais')
        .replace(/r\$\s*/g, '');

    const match = workText.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!match) return null;

    let val = match[1].replace(',', '.');
    return parseFloat(val);
}

function parseInstallments(text: string): number | null {
    const norm = normalise(text);
    const match = norm.match(/(\d+)\s*(?:x|vezes|parcelas)/i);
    if (match) return parseInt(match[1]);
    if (norm.includes('parcelado')) return 2; // Assumption if no number
    return null;
}

// ── Layer 1: Deterministic Decision Logic ────────────────────────────────────

function resolveFinalFields(normText: string) {
    let category: string = 'extras';
    let payment_method: string = 'dinheiro';
    let type: TransactionType = 'EXPENSE';
    let confidence = 0.5;
    let reason = "Inferido por contexto geral";

    // 1. Detection of Income
    const incomeKeywords = ["recebi", "entrou", "caiu", "pix recebido", "me pagaram", "salario", "salário", "renda"];
    if (incomeKeywords.some(kw => normText.includes(kw))) {
        type = 'INCOME';
        category = 'extras'; // Will be refined
        confidence = 0.9;
    }

    // 2. High Priority Category Rules
    if (["fatura", "rotativo", "anuidade", "juros do cartao"].some(kw => normText.includes(kw))) {
        category = "cartão de credito";
        payment_method = "cartao  de credito";
        confidence = 0.98;
        reason = "Regra fixa: Encargos de cartão";
    } else if (["gasolina", "combustivel", "etanol", "posto", "abasteci"].some(kw => normText.includes(kw))) {
        category = "transporte/veículos";
        confidence = 0.95;
        reason = "Regra fixa: Combustível";
    } else if (["netflix", "prime video", "spotify", "globoplay", "google one"].some(kw => normText.includes(kw))) {
        category = "assinaturas";
        confidence = 0.98;
        reason = "Regra fixa: Assinatura digital";
    } else {
        // General keyword search
        for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            if (keywords.some(kw => normText.includes(kw))) {
                category = catName;
                confidence = 0.9;
                reason = `Keyword match: ${catName}`;
                break;
            }
        }
    }

    // 3. Payment Method Rules
    for (const [pmName, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
        if (keywords.some(kw => normText.includes(kw))) {
            payment_method = pmName === 'parcelado' ? 'cartao  de credito' : pmName;
            if (pmName === 'parcelado') {
                reason += " | Detectado parcelamento";
            }
            break;
        }
    }

    return { category, payment_method, type, confidence, reason };
}

// ── Layer 3: Training Retrieval (Learning Layer) ──────────────────────────────

async function getRecentExamples(userId: string) {
    try {
        // Simple string similarity fallback since we don't have vector search enabled here
        // We fetch the last 20 examples and we'll filter them
        const { data } = await supabase
            .from('ai_training_examples')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        return data || [];
    } catch (err) {
        console.error('Error fetching AI examples:', err);
        return [];
    }
}

// ── Final Parser Orchestrator ────────────────────────────────────────────────

import { parseTransactionWithAI } from './geminiAI';

export const parseTranscriptionAsync = async (
    text: string,
    userId: string,
    categories: Category[],
    paymentMethods: PaymentMethod[]
): Promise<ParsedTransaction> => {
    const raw = text.trim();
    const norm = normalise(raw);

    // Step 1: Rule-based Layer 1
    const { category: ruleCat, payment_method: rulePM, type: ruleType, confidence: ruleConf, reason: ruleReason } = resolveFinalFields(norm);
    const amount = parseAmount(raw);
    const installments = parseInstallments(raw);

    // Step 2: Retrieval Layer 3
    const examples = await getRecentExamples(userId);

    // Step 3: LLM Layer 2 (Refinement)
    let aiResult = null;
    try {
        aiResult = await parseTransactionWithAI(raw, examples);
    } catch (err) {
        console.error('LLM Layer failed:', err);
    }

    // Combined Decision Logic
    const finalType = aiResult?.tipo === 'RECEITA' ? 'INCOME' : ruleType;
    const finalAmount = aiResult?.valor || amount;
    const finalCategoryStr = (aiResult && aiResult.confianca > 0.85) ? aiResult.categoria : ruleCat;
    const finalPMStr = installments ? 'parcelado' : (aiResult?.metodo_pagamento || rulePM);

    // Map internal strings to actual DB IDs
    const targetCat = categories.find(c => normalise(c.name) === normalise(finalCategoryStr)) ||
        categories.find(c => c.id === 'cat_extras') || categories[0];

    const targetPM = paymentMethods.find(pm => normalise(pm.name).includes(normalise(finalPMStr === 'parcelado' ? 'credito' : finalPMStr))) ||
        paymentMethods.find(pm => pm.id === 'pm_dinheiro') || paymentMethods[0];

    // Dates
    let date = format(new Date(), 'yyyy-MM-dd');
    if (norm.includes('ontem')) date = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    const finalConfidence = aiResult ? Math.max(ruleConf, aiResult.confianca) : ruleConf;

    return {
        type: finalType,
        description: aiResult?.descricao || raw,
        amount: finalAmount,
        date,
        categoryId: targetCat.id,
        paymentMethodId: targetPM.id,
        installments: installments || aiResult?.parcelas || null,
        confidence: finalConfidence,
        needs_review: (finalAmount === null || finalConfidence < 0.85),
        reason: aiResult?.motivo || ruleReason,
        currency: "BRL"
    };
};

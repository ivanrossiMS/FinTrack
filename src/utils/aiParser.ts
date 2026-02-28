import { TransactionType, Category, PaymentMethod, Supplier } from '../models/types';
import { format, subDays, addMonths } from 'date-fns';

export interface ParsedTransaction {
    type: TransactionType;
    description: string;
    amount: number;
    date: string;
    categoryId: string;
    paymentMethodId?: string;
    supplierId?: string;
    observation?: string;
    confidence: number;
    needsClarification: boolean;
    question?: string;
}

// ─── Trigger-word prefix phrases to strip from the spoken text ─────────────────
// Only the ACTION words at the START — never mid-sentence content words
const PREFIX_STRIPS = [
    'gastei', 'paguei', 'comprei', 'recebi', 'ganhei', 'transferi',
    'fiz um lançamento de', 'fiz um pagamento de', 'anotar',
    'registrar', 'lançar', 'adicionar', 'botar',
    'novo lançamento', 'nova despesa', 'nova receita',
    'foi um gasto de', 'saiu', 'entrou',
];

// ─── True filler: only words that NEVER are part of a description ──────────────
const PURE_FILLER = new Set([
    // money units
    'reais', 'real', 'conto', 'contos', 'pila', 'pilas', 'bala',
    // articles/prepositions
    'um', 'uma', 'uns', 'umas',
    'de', 'do', 'da', 'dos', 'das',
    'o', 'a', 'os', 'as',
    'no', 'na', 'nos', 'nas',
    'pelo', 'pela', 'pelos', 'pelas',
    'ao', 'aos', 'à', 'às',
    'por', 'pra', 'pro', 'com',
    // action/noisy words
    'gastei', 'paguei', 'comprei', 'gastos', 'gasto', 'valor',
    // conclusion words
    'ok', 'okay', 'finalizar', 'pronto', 'concluir', 'confirmar',
]);

// Words that signal DATE context — the word AND the following day number should be skipped
const DATE_SIGNALS = new Set(['hoje', 'ontem', 'anteontem', 'dia', 'semana', 'mês', 'mes', 'amanhã', 'amanha']);

// Words that signal PAYMENT METHOD context
const PAYMENT_SIGNALS = new Set(['pix', 'crédito', 'credito', 'débito', 'debito',
    'dinheiro', 'espécie', 'especie', 'cartão', 'cartao', 'nubank', 'inter', 'itaú', 'itau',
    'bradesco', 'santander', 'cash']);

// ── Income keywords ────────────────────────────────────────────────────────────
const INCOME_KEYWORDS = [
    'recebi', 'ganhei', 'salário', 'salario', 'renda', 'pix recebido',
    'venda', 'provento', 'receita', 'depósito', 'deposito', 'freelance',
    'entrou', 'transferência recebida', 'reembolso', 'dividendos',
];

const EXPENSE_KEYWORDS = [
    'gastei', 'paguei', 'comprei', 'compra', 'débito', 'debito', 'crédito', 'credito',
    'saiu', 'pagamento', 'boleto', 'conta', 'fatura',
];

// ── Category keyword heuristics (extended) ────────────────────────────────────
const CATEGORY_HINTS: { keywords: string[]; themes: string[] }[] = [
    {
        keywords: ['mercado', 'supermercado', 'compras', 'carrefour', 'pão de açucar', 'extra', 'atacadão', 'atacadao', 'rancho',
            'cerveja', 'cervejinha', 'bebida', 'refrigerante', 'suco', 'vinho', 'chopp', 'gelada'],
        themes: ['Compras / Mercado Extra'],
    },
    {
        keywords: ['almoço', 'almoco', 'jantar', 'ifood', 'rappi', 'lanche', 'restaurante', 'padaria', 'pão', 'pao', 'misto', 'bauru', 'café', 'cafe',
            'pizza', 'hamburguer', 'hamburger', 'sushi', 'comida', 'feira'],
        themes: ['Alimentação'],
    },
    {
        keywords: ['ipva', 'iptu', 'imposto', 'taxa', 'receita federal', 'tributo'],
        themes: ['Impostos & Taxas'],
    },
    {
        keywords: ['aluguel', 'condomínio', 'condominio', 'luz', 'energia', 'cpfl', 'enel',
            'água', 'agua', 'sabesp', 'internet', 'vivo', 'claro', 'oi', 'tim', 'net', 'gás', 'gas', 'comgás'],
        themes: ['Contas', 'Casa & Manutenção'],
    },
    {
        keywords: ['escola', 'faculdade', 'curso', 'livro', 'mensalidade', 'aula', 'matrícula', 'matricula',
            'pós', 'pos', 'mba', 'udemy', 'alura', 'coursera', 'idioma', 'inglês', 'ingles', 'espanhol',
            'treinamento', 'workshop', 'estudo', 'papelaria', 'material escolar', 'caderno', 'lápis', 'caneta'],
        themes: ['Educação & Livros'],
    },
    {
        keywords: ['remédio', 'remedio', 'farmácia', 'farmacia', 'drogaria', 'médico', 'medico', 'dentista', 'hospital',
            'plano de saúde', 'saúde', 'exame', 'terapia', 'psicólogo', 'clínica'],
        themes: ['Saúde'],
    },
    {
        keywords: ['uber', '99', 'táxi', 'taxi', 'gasolina', 'combustível', 'combustivel', 'etanol', 'diesel',
            'estacionamento', 'pedágio', 'pedagio', 'mecânico', 'mecanico', 'oficina', 'pneu', 'revisão', 'seguro auto'],
        themes: ['Transporte / Veículos'],
    },
    {
        keywords: ['ração', 'racao', 'veterinário', 'veterinario', 'petshop', 'pet', 'cachorro', 'gato', 'banho', 'tosa'],
        themes: ['Pets & Cuidado'],
    },
    {
        keywords: ['netflix', 'spotify', 'disney', 'hbo', 'prime', 'amazon', 'youtube', 'assinatura', 'plano', 'mensal mensal', 'globoplay'],
        themes: ['Assinaturas'],
    },
    {
        keywords: ['roupa', 'tênis', 'tenis', 'sapato', 'blusa', 'calça', 'vestuário', 'moda', 'shopee', 'shein', 'zara', 'renner', 'cea', 'boné', 'bone', 'bolsa'],
        themes: ['Vestuário'],
    },
    {
        keywords: ['cabeleireiro', 'barbeiro', 'barba', 'corte', 'maquiagem', 'perfume', 'cosmético', 'beleza', 'autocuidado', 'manicure', 'salão', 'unha'],
        themes: ['Beleza & Autocuidado'],
    },
    {
        keywords: ['cinema', 'show', 'festa', 'balada', 'viagem', 'hotel', 'passagem', 'turismo', 'lazer', 'game', 'jogo', 'bar', 'barzinho', 'boteco'],
        themes: ['Lazer', 'Viagens'],
    },
    {
        keywords: ['salário', 'salario', 'pagamento', 'recebi', 'pix recebido', 'transferência recebida', 'doc', 'ted', 'depósito'],
        themes: ['Salário', 'Serviços / Consultorias'],
    },
    {
        keywords: ['dividendos', 'juros', 'rendimento', 'bolsa', 'ações', 'fii', 'investimento', 'tesouro', 'cdb'],
        themes: ['Rendimentos', 'Investimentos'],
    },
    {
        keywords: ['outros', 'diverso', 'extra', 'geral', 'qualquer'],
        themes: ['Extras'],
    },
];

// ── Payment method keyword map ─────────────────────────────────────────────────
const PAYMENT_KEYWORDS: { patterns: RegExp; themes: string[] }[] = [
    { patterns: /\bpix\b/, themes: ['pix'] },
    { patterns: /\bcr[eé]dito\b|\bcart[aã]o\b(?!\s+de\s+d[eé]bito)/, themes: ['crédito', 'credito', 'cartão crédito', 'visa', 'mastercard'] },
    { patterns: /\bd[eé]bito\b/, themes: ['débito', 'debito', 'cartão débito'] },
    { patterns: /\bdinheiro\b|\besp[eé]cie\b|\bcash\b/, themes: ['dinheiro', 'espécie', 'especie', 'cash'] },
    { patterns: /\bnubank\b|\broxinho\b/, themes: ['nubank'] },
    { patterns: /\binter\b|\bbanco inter\b/, themes: ['inter'] },
    { patterns: /\bitaú\b|\bitau\b/, themes: ['itaú', 'itau'] },
    { patterns: /\bbradesco\b/, themes: ['bradesco'] },
    { patterns: /\bsantander\b/, themes: ['santander'] },
    { patterns: /\bc6\b/, themes: ['c6', 'c6bank'] },
    { patterns: /\bbb\b|\bbrasil\b/, themes: ['banco do brasil', 'bb'] },
    { patterns: /\bcaixa\b/, themes: ['caixa', 'cef'] },
];

// ── Normalise text: lowercase, remove accents ─────────────────────────────────
function normalise(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// ── Score a user category against a theme name ────────────────────────────────
function scoreCategory(cat: Category, themes: string[], type: TransactionType): number {
    const catNorm = normalise(cat.name);
    let score = 0;
    for (const theme of themes) {
        const themeNorm = normalise(theme);
        if (catNorm === themeNorm) { score = 100; break; }
        if (catNorm.includes(themeNorm) || themeNorm.includes(catNorm)) { score = Math.max(score, 80); }
    }
    if (score > 0 && (cat.type === type || cat.type === 'BOTH')) score += 10;
    return score;
}

// ── Parse a day number mentioned in speech into a yyyy-MM-dd string ──────────
function parseDayMention(day: number): string {
    const today = new Date();
    const todayDay = today.getDate();
    // If mentioned day is still ahead or today → this month; otherwise → next month
    const month = day >= todayDay ? today.getMonth() : today.getMonth() + 1;
    const year = month > 11 ? today.getFullYear() + 1 : today.getFullYear();
    const clampedMonth = month > 11 ? 0 : month;
    const maxDay = new Date(year, clampedMonth + 1, 0).getDate();
    const safeDay = Math.min(day, maxDay);
    return format(new Date(year, clampedMonth, safeDay), 'yyyy-MM-dd');
}

// ── Main parser ────────────────────────────────────────────────────────────────
export const parseTranscription = (
    text: string,
    categories: Category[],
    paymentMethods: PaymentMethod[],
    suppliers: Supplier[]
): ParsedTransaction => {
    console.log('[aiParser] Input:', text);

    const raw = text.trim();
    const norm = normalise(raw);

    let type: TransactionType = 'EXPENSE'; // Default
    let amount = 0;
    let date = format(new Date(), 'yyyy-MM-dd');
    let categoryId = '';
    let paymentMethodId = paymentMethods.length > 0 ? paymentMethods[0].id : undefined;
    let supplierId: string | undefined;
    let confidence = 0.4;

    // ── 1. Transaction type deduction ────────────────────────────────────────
    const isIncome = INCOME_KEYWORDS.some(kw => norm.includes(normalise(kw)));
    const isExpense = EXPENSE_KEYWORDS.some(kw => norm.includes(normalise(kw)));

    if (isIncome && !isExpense) {
        type = 'INCOME';
        confidence += 0.2;
    } else if (isExpense && !isIncome) {
        type = 'EXPENSE';
        confidence += 0.2;
    } else if (isIncome && isExpense) {
        // Ambiguous, but if it has "venda" it's likely income, if "compra" likely expense
        if (norm.includes('venda')) type = 'INCOME';
        else type = 'EXPENSE';
        confidence += 0.1;
    }

    // ── 2. Amount extraction ─────────────────────────────────────────────────
    // Order: R$###, ### reais, plain number. Take the LARGEST plausible match to avoid picking day numbers.
    const amountMatches = [...norm.matchAll(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|contos?|pilas?|bala)?/g)];
    let bestAmount = 0;
    for (const m of amountMatches) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (val > 0 && val < 1_000_000 && val > bestAmount) bestAmount = val;
    }
    // Written numbers
    const written: [string, number][] = [
        ['mil e quinhentos', 1500], ['mil e duzentos', 1200], ['dois mil', 2000], ['tres mil', 3000],
        ['um mil', 1000], ['quinhentos', 500], ['quatrocentos', 400], ['trezentos', 300],
        ['duzentos', 200], ['cento e cinquenta', 150], ['cento e vinte', 120], ['cento e dez', 110],
        ['cem', 100], ['cento', 100], ['noventa', 90], ['oitenta', 80], ['setenta', 70],
        ['sessenta', 60], ['cinquenta', 50], ['quarenta', 40], ['trinta', 30], ['vinte e cinco', 25],
        ['vinte', 20], ['quinze', 15], ['quatorze', 14], ['treze', 13], ['doze', 12],
        ['onze', 11], ['dez', 10], ['nove', 9], ['oito', 8], ['sete', 7], ['seis', 6],
        ['cinco', 5], ['quatro', 4], ['tres', 3], ['dois', 2], ['um conto', 1], ['um pila', 1],
    ];
    for (const [word, val] of written) {
        if (norm.includes(word) && val > bestAmount) { bestAmount = val; break; }
    }
    if (bestAmount > 0) { amount = bestAmount; confidence += 0.2; }

    // ── 3. Date extraction ────────────────────────────────────────────────────
    if (norm.includes('ontem')) {
        date = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    } else if (norm.includes('anteontem')) {
        date = format(subDays(new Date(), 2), 'yyyy-MM-dd');
    } else if (norm.includes('amanha') || norm.includes('amanhã')) {
        date = format(subDays(new Date(), -1), 'yyyy-MM-dd');
    } else {
        // "dia 10", "no dia 15", "dia cinco"
        const dayNumMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
        if (dayNumMatch) {
            const d = parseInt(dayNumMatch[1]);
            if (d >= 1 && d <= 31) date = parseDayMention(d);
        }
        // Month mentions: "em janeiro", "em fevereiro" ...
        const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        for (let i = 0; i < monthNames.length; i++) {
            if (norm.includes(monthNames[i])) {
                const today = new Date();
                const targetMonth = i; // 0-indexed
                const year = targetMonth < today.getMonth()
                    ? today.getFullYear() + 1
                    : today.getFullYear();
                const dayNum = norm.match(/\bdia\s+(\d{1,2})\b/);
                const day = dayNum ? parseInt(dayNum[1]) : today.getDate();
                date = format(new Date(year, targetMonth, day), 'yyyy-MM-dd');
                break;
            }
        }
        // "próximo mês"
        if (norm.includes('proximo mes') || norm.includes('próximo mês')) {
            date = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
        }
    }

    // ── 4. Category matching ──────────────────────────────────────────────────
    // Strategy A: keyword hints → themes → score user categories
    let bestCatScore = 0;
    let bestCat: Category | undefined;

    for (const hint of CATEGORY_HINTS) {
        if (hint.keywords.some(kw => norm.includes(normalise(kw)))) {
            for (const cat of categories) {
                const s = scoreCategory(cat, hint.themes, type);
                if (s > bestCatScore) { bestCatScore = s; bestCat = cat; }
            }
        }
    }

    // Strategy B: direct fuzzy match — any user category name that appears in the text
    if (bestCatScore < 50) {
        for (const cat of categories) {
            const catNorm = normalise(cat.name);
            if (norm.includes(catNorm) && (cat.type === type || cat.type === 'BOTH')) {
                if (80 > bestCatScore) { bestCatScore = 80; bestCat = cat; }
            }
        }
    }

    // Strategy C: partial word overlap ≥ 4 chars
    if (bestCatScore < 50) {
        for (const cat of categories) {
            const catWords = normalise(cat.name).split(/\s+/).filter(w => w.length >= 4);
            for (const cw of catWords) {
                if (norm.includes(cw) && (cat.type === type || cat.type === 'BOTH')) {
                    if (60 > bestCatScore) { bestCatScore = 60; bestCat = cat; }
                }
            }
        }
    }

    // Strategy D: fallback to "Extras" (Expense) or "Rendimentos" (Income)
    if (!bestCat) {
        if (type === 'INCOME') {
            bestCat = categories.find(c => c.name === 'Rendimentos') || categories.find(c => c.type === 'INCOME');
        } else {
            bestCat = categories.find(c => c.name === 'Extras') || categories.find(c => c.type === 'EXPENSE');
        }
    }

    if (bestCat) { categoryId = bestCat.id; confidence += bestCatScore >= 50 ? 0.2 : 0.05; }

    // ── 5. Payment method matching ────────────────────────────────────────────
    for (const { patterns, themes } of PAYMENT_KEYWORDS) {
        if (patterns.test(norm)) {
            const found = paymentMethods.find(m =>
                themes.some(t => normalise(m.name).includes(normalise(t)))
            );
            if (found) { paymentMethodId = found.id; confidence += 0.1; break; }
        }
    }

    // ── 6. Supplier matching ──────────────────────────────────────────────────
    for (const s of suppliers) {
        if (norm.includes(normalise(s.name))) { supplierId = s.id; confidence += 0.05; break; }
    }

    // ── 7. Description extraction ─────────────────────────────────────────────
    // Remove prefix trigger phrases first (only at the start)
    let workText = raw;
    for (const prefix of PREFIX_STRIPS) {
        const prefixLower = prefix.toLowerCase();
        const lower = workText.toLowerCase();
        if (lower.startsWith(prefixLower + ' ') || lower.startsWith(prefixLower)) {
            workText = workText.substring(prefix.length).trim();
            break;
        }
    }

    // Tokenise and filter
    const tokens = workText.split(/\s+/);
    let skipNext = false;
    const descTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        const tokNorm = normalise(tok.replace(/[.,!?;:]/g, ''));

        if (skipNext) { skipNext = false; continue; }
        if (PURE_FILLER.has(tokNorm)) continue;
        if (DATE_SIGNALS.has(tokNorm)) { skipNext = true; continue; } // skip "dia X"
        if (PAYMENT_SIGNALS.has(tokNorm)) continue;
        if (/^r\$/.test(tokNorm)) continue; // skip "r$"
        if (/^\$/.test(tokNorm)) continue;   // skip bare "$"
        if (/^\d+([.,]\d{1,2})?$/.test(tokNorm)) continue; // bare numbers or amounts
        if (tok.length <= 1) continue;

        descTokens.push(tok);
    }

    let description = descTokens.join(' ').trim();

    // Capitalise first letter
    if (description) {
        description = description.charAt(0).toUpperCase() + description.slice(1).toLowerCase();
    }

    // Fallback: if description is suspiciously short or empty, take the middle part (after trigger, before amount)
    if (!description || description.length < 2) {
        // Just take first 5 original tokens that aren't pure numbers or currency symbols
        description = raw.split(/\s+/)
            .filter(w => !/^\d+([.,]\d+)?$/.test(w) && !/^(r\$|\$)$/i.test(w) && w.length > 1)
            .slice(0, 5)
            .join(' ');

        if (description) {
            description = description.charAt(0).toUpperCase() + description.slice(1);
        }
    }

    confidence = Math.min(confidence, 1.0);

    const result: ParsedTransaction = {
        type,
        description: description || (type === 'EXPENSE' ? 'Compra' : 'Receita'),
        amount,
        date,
        categoryId,
        paymentMethodId,
        supplierId,
        observation: '',
        confidence: raw.split(/\s+/).length < 3 ? confidence + 0.2 : confidence, // Boost for short clear commands
        needsClarification: amount === 0,
        question: amount === 0 ? 'Qual o valor do lançamento?' : '',
    };

    console.log('[aiParser] Result:', result);
    return result;
};
// ── Async AI-first parser ──────────────────────────────────────────────────────
import { parseTransactionWithAI } from './geminiAI';

export const parseTranscriptionAsync = async (
    text: string,
    categories: Category[],
    paymentMethods: PaymentMethod[],
    suppliers: Supplier[],
    examples: any[] = []
): Promise<ParsedTransaction> => {
    // 1. Try AI first for elite perception
    try {
        const categoryNames = categories.map(c => c.name);
        const aiResult = await parseTransactionWithAI(text, categoryNames, examples);

        if (aiResult && aiResult.confianca > 0.6) {
            console.log('[aiParser] AI perception success:', aiResult);

            const cat = categories.find(c => normalise(c.name) === normalise(aiResult.categoria)) ||
                categories.find(c => c.type === (aiResult.tipo === 'RECEITA' ? 'INCOME' : 'EXPENSE') || c.type === 'BOTH');

            return {
                type: aiResult.tipo === 'RECEITA' ? 'INCOME' : 'EXPENSE',
                description: aiResult.descricao,
                amount: aiResult.valor || 0,
                date: format(new Date(), 'yyyy-MM-dd'),
                categoryId: cat?.id || categories.find(c => c.name === 'Extras')?.id || '',
                paymentMethodId: paymentMethods.length > 0 ? paymentMethods[0].id : undefined,
                confidence: aiResult.confianca,
                needsClarification: aiResult.precisa_confirmacao || !aiResult.valor,
                question: !aiResult.valor ? 'Qual o valor do lançamento?' : '',
                observation: 'Processado por Inteligência de Elite (ML Engineer)'
            };
        }
    } catch (err) {
        console.error('[aiParser] AI Parse error, falling back to heuristics:', err);
    }

    // 2. Fallback to local heuristics
    return parseTranscription(text, categories, paymentMethods, suppliers);
};

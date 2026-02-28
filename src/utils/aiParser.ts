import { TransactionType, Category, PaymentMethod } from '../models/types';
import { format, subDays } from 'date-fns';

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
    currency: "BRL";
    needs_review: boolean;
}

// ─── Trigger-word prefix phrases to strip from the spoken text ─────────────────
const PREFIX_STRIPS = [
    'gastei', 'paguei', 'comprei', 'recebi', 'ganhei', 'transferi',
    'fiz um lançamento de', 'fiz um pagamento de', 'anotar',
    'registrar', 'lançar', 'adicionar', 'botar',
    'novo lançamento', 'nova despesa', 'nova receita',
    'foi um gasto de', 'saiu', 'entrou',
];

// ─── True filler: only words that NEVER are part of a description ──────────────
const PURE_FILLER = new Set([
    'reais', 'real', 'conto', 'contos', 'pila', 'pilas', 'bala',
    'um', 'uma', 'uns', 'umas',
    'de', 'do', 'da', 'dos', 'das',
    'o', 'a', 'os', 'as',
    'no', 'na', 'nos', 'nas',
    'pelo', 'pela', 'pelos', 'pelas',
    'ao', 'aos', 'à', 'às',
    'por', 'pra', 'pro', 'com',
    'gastei', 'paguei', 'comprei', 'gastos', 'gasto', 'valor',
    'ok', 'okay', 'finalizar', 'pronto', 'concluir', 'confirmar',
]);

const DATE_SIGNALS = new Set(['hoje', 'ontem', 'anteontem', 'dia', 'semana', 'mês', 'mes', 'amanhã', 'amanha']);

const PAYMENT_SIGNALS = new Set(['pix', 'crédito', 'credito', 'débito', 'debito',
    'dinheiro', 'espécie', 'especie', 'cartão', 'cartao', 'nubank', 'inter', 'itaú', 'itau',
    'bradesco', 'santander', 'cash']);

const INCOME_KEYWORDS = [
    'recebi', 'ganhei', 'salário', 'salario', 'renda', 'pix recebido',
    'venda', 'provento', 'receita', 'depósito', 'deposito', 'freelance',
    'entrou', 'transferência recebida', 'reembolso', 'dividendos', 'rendimento', 'aporte extra',
];

const EXPENSE_KEYWORDS = [
    'gastei', 'paguei', 'comprei', 'compra', 'débito', 'debito', 'crédito', 'credito',
    'saiu', 'pagamento', 'boleto', 'conta', 'fatura',
];

// ─── Deterministic Category Dictionary (Official 21) ───────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'alimentacao': [
        "almoco", "almoço", "jantar", "lanche", "restaurante", "lanchonete", "padaria", "cafe", "café", "cafeteria",
        "ifood", "i-food", "uber eats", "ubereats", "delivery", "pizza", "hamburguer", "hambúrguer", "acai", "açaí",
        "sorvete", "sorveteria", "churrasco", "refeicao", "refeição", "bebida", "agua", "água", "refrigerante", "refri",
        "suco", "energético", "energetico"
    ],
    'assinaturas': [
        "netflix", "amazon prime", "prime video", "primevideo", "disney", "disney+", "hbo", "max", "globoplay", "globo play",
        "spotify", "deezer", "youtube premium", "yt premium", "icloud", "google one", "microsoft 365", "office 365",
        "adobe", "canva", "chatgpt", "notion", "dropbox", "kindle unlimited", "game pass", "xbox game pass", "ps plus",
        "playstation plus", "assinatura", "assinaturas", "mensalidade de app"
    ],
    'beleza e autocuidado': [
        "salao", "salão", "cabelo", "barbearia", "corte", "escova", "progressiva", "tintura",
        "manicure", "pedicure", "unha", "sobrancelha", "depilacao", "depilação",
        "skin care", "skincare", "hidratante", "perfume", "maquiagem", "massagem", "spa"
    ],
    'cartão de credito': [
        "fatura", "fatura do cartao", "fatura do cartão", "cartao", "cartão", "anuidade", "rotativo", "juros do cartao",
        "parcelamento do cartao", "parcela do cartao", "nubank fatura", "itau card", "santander card", "inter card"
    ],
    'casa e manutencao': [
        "conserto", "manutencao", "manutenção", "pedreiro", "pintor", "eletricista", "encanador",
        "material de construcao", "material de construção", "cimento", "tinta", "ferramenta", "ferramentas",
        "movel", "móvel", "sofa", "sofá", "colchao", "colchão", "cama", "guarda-roupa", "jardinagem", "corte de grama"
    ],
    'compras/mercado': [
        "mercado", "supermercado", "atacadao", "atacadão", "assai", "açai atacadista", "carrefour", "pao de acucar",
        "pão de açúcar", "hortifruti", "feira", "acougue", "açougue", "rancho", "compra do mes", "compra do mês",
        "produtos de limpeza", "detergente", "sabao", "sabão", "papel higienico", "papel higiênico"
    ],
    'contas': [
        "internet", "wifi", "banda larga", "vivo fibra", "claro net", "oi fibra",
        "luz", "energia", "agua", "água", "esgoto", "gas", "gás",
        "telefone", "celular", "plano", "condominio", "condomínio", "boleto de conta"
    ],
    'dividas/emprestimos': [
        "emprestimo", "empréstimo", "financiamento", "consignado", "acordo", "renegociacao", "renegociação",
        "serasa", "parcela do financiamento", "parcela do emprestimo", "boleto do emprestimo", "boleto do empréstimo"
    ],
    'educacao e livros': [
        "mensalidade escolar", "mensalidade", "escola", "colegio", "colégio", "faculdade", "curso", "idioma", "ingles", "inglês",
        "apostila", "livro", "material escolar", "caderno", "reforco", "reforço", "aula particular"
    ],
    'extras': [
        "diversos", "outros", "imprevisto", "extra", "avulso", "aleatorio", "aleatório"
    ],
    'impostos e taxas': [
        "iptu", "ipva", "ir", "imposto de renda", "darf", "das", "licenciamento", "detran",
        "multa", "multa de transito", "multa de trânsito", "taxa", "cartorio", "cartório"
    ],
    'investimentos': [
        "investi", "investimento", "aporte", "apliquei", "tesouro", "cdb", "lci", "lca", "acoes", "ações",
        "etf", "fii", "fundo", "fundos", "corretora", "xp", "rico", "nuinvest"
    ],
    'lazer': [
        "cinema", "show", "teatro", "bar", "balada", "ingresso", "evento", "passeio", "parque"
    ],
    'pets e cuidado': [
        "pet", "pet shop", "petshop", "racao", "ração", "banho e tosa", "veterinario", "veterinário",
        "vacina do pet", "areia", "tapete higienico", "tapete higiênico"
    ],
    'presentes e doacoes': [
        "presente", "lembrancinha", "aniversario", "aniversário", "doacao", "doação", "dizimo", "dízimo",
        "igreja", "ong", "vaquinha"
    ],
    'saude': [
        "farmacia", "farmácia", "remedio", "remédio", "medicamento",
        "consulta", "medico", "médico", "exame", "laboratorio", "laboratório",
        "dentista", "psicologo", "psicólogo", "terapia", "fisioterapia", "academia"
    ],
    'seguros': [
        "seguro", "seguro do carro", "seguro automovel", "seguro automóvel", "seguro residencial", "seguro de vida",
        "seguro viagem", "assistencia 24h", "assistência 24h", "proteção veicular"
    ],
    'tecnologia': [
        "celular", "iphone", "tablet", "notebook", "computador", "pc", "monitor", "mouse", "teclado", "impressora",
        "assistencia tecnica", "assistência técnica", "conserto do celular", "hardware", "eletronico", "eletrônico"
    ],
    'transporte / veiculos': [
        "gasolina", "combustivel", "combustível", "etanol", "alcool", "álcool", "diesel",
        "posto", "abasteci", "abastecimento",
        "uber", "99", "taxi", "táxi", "onibus", "ônibus", "metro", "metrô", "passagem",
        "estacionamento", "zona azul",
        "lava jato", "lavagem", "pneu", "troca de oleo", "troca de óleo", "oficina", "mecanico", "mecânico",
        "revisao", "revisão", "alinhamento", "balanceamento", "bateria"
    ],
    'vestuario': [
        "roupa", "camisa", "calca", "calça", "sapato", "tenis", "tênis", "vestido", "shopping", "moda",
        "costureira", "conserto de roupa", "loja de roupa"
    ],
    'viagens': [
        "viagem", "hotel", "pousada", "airbnb", "passagem", "voo", "aereo", "aéreo", "milhas",
        "aluguel de carro", "transfer", "tour", "excursao", "excursão"
    ],
    'cartao de credito': [
        "fatura", "nubank", "inter card", "mastercard", "visa", "anuidade", "cartão de crédito", "crédito", "limite do cartão"
    ],
    'compras / mercado extra': [
        "mercado", "supermercado", "compras", "compras do mês", "carrefour", "extra", "pão de açúcar", "atacado", "feira"
    ],
    'dividas & emprestimos': [
        "emprestimo", "empréstimo", "divida", "dívida", "parcela do banco", "juros", "financiamento", "quitar", "shopee parcelado"
    ],
    'impostos & taxas': [
        "iptu", "ipva", "ir", "imposto de renda", "darf", "das", "licenciamento", "detran",
        "multa", "multa de transito", "multa de trânsito", "taxa", "cartorio", "cartório"
    ],
    'beleza & autocuidado': [
        "shampoo", "creme", "perfume", "salao", "salão", "cabeleireiro", "barbeiro", "barba", "unha", "manicure", "depilação", "estética", "autocuidado"
    ],
    'casa & manutencao': [
        "reforma", "pintura", "materiais de construcao", "torneira", "chuveiro", "lampada", "móveis", "decoracao", "decoração", "limpeza", "faxina"
    ],
    'presentes & doacoes': [
        "presente", "lembrancinha", "aniversario", "aniversário", "doacao", "doação", "dizimo", "dízimo",
        "igreja", "ong", "vaquinha"
    ],
    'educacao & livros': [
        "curso", "faculdade", "escola", "livro", "mensalidade escolar", "material escolar", "udemy", "hotmart"
    ]
};

const PRIORITY_ORDER = [
    'cartao de credito',
    'viagens',
    'assinaturas',
    'contas',
    'transporte / veiculos',
    'compras / mercado extra',
    'educacao & livros',
    'saude',
    'casa & manutencao',
    'vestuario',
    'presentes & doacoes',
    'pets & cuidado',
    'impostos & taxas',
    'investimentos',
    'beleza & autocuidado',
    'lazer',
    'dividas & emprestimos',
    'alimentacao'
];

function normalise(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,!?;:]/g, '');
}

function resolveCategoryDeterministic(normText: string): { name: string; confidence: number } {
    for (const catName of PRIORITY_ORDER) {
        const keywords = CATEGORY_KEYWORDS[catName];
        if (keywords.some(kw => normText.includes(normalise(kw)))) {
            return { name: catName, confidence: 0.95 };
        }
    }
    return { name: 'extras', confidence: 0.5 };
}

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

function parseDayMention(day: number): string {
    const today = new Date();
    const todayDay = today.getDate();
    const month = day >= todayDay ? today.getMonth() : today.getMonth() + 1;
    const year = month > 11 ? today.getFullYear() + 1 : today.getFullYear();
    const clampedMonth = month > 11 ? 0 : month;
    const maxDay = new Date(year, clampedMonth + 1, 0).getDate();
    const safeDay = Math.min(day, maxDay);
    return format(new Date(year, clampedMonth, safeDay), 'yyyy-MM-dd');
}

export const parseTranscription = (
    text: string,
    categories: Category[],
    paymentMethods: PaymentMethod[]
): ParsedTransaction => {
    console.log('[aiParser] Input:', text);
    const raw = text.trim();
    const norm = normalise(raw);

    let type: TransactionType = 'EXPENSE';
    let amount = 0;
    let date = format(new Date(), 'yyyy-MM-dd');
    let categoryId = '';
    // FORÇAR "Dinheiro" como padrão prioritário se não houver detecção
    const defaultPM = paymentMethods.find(m => m.name.toUpperCase().includes('DINHEIRO')) || paymentMethods[0];
    let paymentMethodId = defaultPM?.id;
    let supplierId: string | undefined;
    let confidence = 0.4;

    const isIncome = INCOME_KEYWORDS.some(kw => norm.includes(normalise(kw)));
    const isExpense = EXPENSE_KEYWORDS.some(kw => norm.includes(normalise(kw)));
    if (isIncome && !isExpense) { type = 'INCOME'; confidence += 0.2; }
    else if (isExpense && !isIncome) { type = 'EXPENSE'; confidence += 0.2; }

    const amountMatches = [...norm.matchAll(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|contos?|pilas?|bala)?/g)];
    let bestAmount = 0;
    for (const m of amountMatches) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (val > 0 && val < 500000 && val > bestAmount) bestAmount = val;
    }
    if (bestAmount > 0) { amount = bestAmount; confidence += 0.2; }

    if (norm.includes('ontem')) date = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    else if (norm.includes('anteontem')) date = format(subDays(new Date(), 2), 'yyyy-MM-dd');
    else {
        const dayNumMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
        if (dayNumMatch) {
            const d = parseInt(dayNumMatch[1]);
            if (d >= 1 && d <= 31) date = parseDayMention(d);
        }
    }

    const detRes = resolveCategoryDeterministic(norm);
    const targetCat = categories.find(c => normalise(c.name) === normalise(detRes.name)) ||
        categories.find(c => c.name.toLowerCase() === 'extras') ||
        categories[0];
    categoryId = targetCat?.id || '';
    confidence = Math.max(confidence, detRes.confidence);

    for (const { patterns, themes } of PAYMENT_KEYWORDS) {
        if (patterns.test(norm)) {
            const found = paymentMethods.find(m => themes.some(t => normalise(m.name).includes(normalise(t))));
            if (found) { paymentMethodId = found.id; confidence += 0.05; break; }
        }
    }

    let workText = raw;
    for (const prefix of PREFIX_STRIPS) {
        if (workText.toLowerCase().startsWith(prefix.toLowerCase())) {
            workText = workText.substring(prefix.length).trim();
            break;
        }
    }
    const tokens = workText.split(/\s+/);
    const descTokens = tokens.filter(tok => {
        const tNorm = normalise(tok);
        return !PURE_FILLER.has(tNorm) && !DATE_SIGNALS.has(tNorm) && !PAYMENT_SIGNALS.has(tNorm) &&
            !/^r\$/.test(tNorm) && !/^\d+([.,]\d+)?$/.test(tNorm) && tok.length > 1;
    });
    let description = descTokens.join(' ').trim();
    if (description) description = description.charAt(0).toUpperCase() + description.slice(1).toLowerCase();

    return {
        type,
        description: description || (type === 'EXPENSE' ? 'Compra' : 'Receita'),
        amount,
        date,
        categoryId,
        paymentMethodId,
        supplierId,
        confidence: Math.min(confidence, 1.0),
        needsClarification: amount === 0,
        question: amount === 0 ? 'Qual o valor do lançamento?' : '',
        currency: "BRL",
        needs_review: amount === 0 || detRes.name === 'extras' || confidence < 0.8
    };
};

import { parseTransactionWithAI } from './geminiAI';

export const parseTranscriptionAsync = async (
    text: string,
    categories: Category[],
    paymentMethods: PaymentMethod[],
    examples: any[] = []
): Promise<ParsedTransaction> => {
    try {
        const aiResult = await parseTransactionWithAI(text, examples);

        if (aiResult && aiResult.confianca > 0.6) {
            const cat = categories.find(c => normalise(c.name) === normalise(aiResult.categoria)) ||
                categories.find(c => c.name.toLowerCase() === 'extras') ||
                categories[0];

            return {
                type: aiResult.tipo === 'RECEITA' ? 'INCOME' : 'EXPENSE',
                description: aiResult.descricao,
                amount: aiResult.valor || 0,
                date: format(new Date(), 'yyyy-MM-dd'),
                categoryId: cat?.id || '',
                paymentMethodId: paymentMethods.find(m => normalise(m.name).includes('dinheiro'))?.id || (paymentMethods.length > 0 ? paymentMethods[0].id : undefined),
                confidence: aiResult.confianca,
                needsClarification: aiResult.precisa_confirmacao || !aiResult.valor,
                question: !aiResult.valor ? 'Qual o valor do lançamento?' : '',
                observation: 'Processado por Inteligência de Elite (ML Engineer)',
                currency: "BRL",
                needs_review: aiResult.precisa_confirmacao || (aiResult.valor || 0) === 0 || aiResult.confianca < 0.8 || aiResult.categoria === 'extras'
            };
        }
    } catch (err) {
        console.error('[aiParser] AI Parse error, falling back to heuristics:', err);
    }
    return parseTranscription(text, categories, paymentMethods);
};

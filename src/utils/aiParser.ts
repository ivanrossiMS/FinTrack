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
        "suco", "energético", "energetico", "mcdonalds", "mc donalds", "bk", "burger king", "subway", "pastel", "pizzaria",
        "espetinho", "marmita", "quentinha", "vr", "vale refeicao", "vale refeição", "alimentacao", "alimentação", "va"
    ],
    'assinaturas': [
        "netflix", "amazon prime", "prime video", "primevideo", "disney", "disney+", "hbo", "max", "globoplay", "globo play",
        "spotify", "deezer", "youtube premium", "yt premium", "icloud", "google one", "microsoft 365", "office 365",
        "adobe", "canva", "chatgpt", "notion", "dropbox", "kindle unlimited", "game pass", "xbox game pass", "ps plus",
        "playstation plus", "assinatura", "assinaturas", "mensalidade de app", "youtube", "star+", "crunchyroll", "deezer",
        "tidal", "apple music", "onlyfans", "patreon", "twitch", "discord nitro"
    ],
    'beleza e autocuidado': [
        "salao", "salão", "cabelo", "barbearia", "corte", "escova", "progressiva", "tintura",
        "manicure", "pedicure", "unha", "sobrancelha", "depilacao", "depilação",
        "skin care", "skincare", "hidratante", "perfume", "maquiagem", "massagem", "spa", "cosmetico", "cosmético",
        "batom", "shampoo", "condicionador", "creme", "barba", "bigode", "estetica", "estética"
    ],
    'cartão de credito': [
        "fatura", "fatura do cartao", "fatura do cartão", "cartao", "cartão", "anuidade", "rotativo", "juros do cartao",
        "parcelamento do cartao", "parcela do cartao", "nubank fatura", "itau card", "santander card", "inter card",
        "limite do cartao", "pagamento fatura", "cartao de credito", "cartão de crédito", "mastercard", "visa", "amex"
    ],
    'casa e manutencao': [
        "conserto", "manutencao", "manutenção", "pedreiro", "pintor", "eletricista", "encanador",
        "material de construcao", "material de construção", "cimento", "tinta", "ferramenta", "ferramentas",
        "movel", "móvel", "sofa", "sofá", "colchao", "colchão", "cama", "guarda-roupa", "jardinagem", "corte de grama",
        "reforma", "obra", "telha", "tijolo", "fio", "lampada", "lâmpada", "torneira", "chuveiro", "vassoura", "rodo"
    ],
    'compras/mercado': [
        "mercado", "supermercado", "atacadao", "atacadão", "assai", "açai atacadista", "carrefour", "pao de acucar",
        "pão de açúcar", "hortifruti", "feira", "acougue", "açougue", "rancho", "compra do mes", "compra do mês",
        "produtos de limpeza", "detergente", "sabao", "sabão", "papel higienico", "papel higiênico", "bahamas", "epa",
        "supermercados", "sacolao", "sacolão", "peixaria", "mercearia", "arroz", "feijao", "leite", "carne"
    ],
    'contas': [
        "internet", "wifi", "banda larga", "vivo fibra", "claro net", "oi fibra",
        "luz", "energia", "agua", "água", "esgoto", "gas", "gás",
        "telefone", "celular", "plano", "condominio", "condomínio", "boleto de conta", "conta de luz", "conta de agua",
        "conta de telefone", "tim", "claro", "vivo", "oi", "sky", "aluguel"
    ],
    'dividas/emprestimos': [
        "emprestimo", "empréstimo", "financiamento", "consignado", "acordo", "renegociacao", "renegociação",
        "serasa", "parcela do financiamento", "parcela do emprestimo", "boleto do emprestimo", "boleto do empréstimo",
        "divida", "dívida", "quitar", "parcelas", "juros"
    ],
    'educacao e livros': [
        "mensalidade escolar", "mensalidade", "escola", "colegio", "colégio", "faculdade", "curso", "idioma", "ingles", "inglês",
        "apostila", "livro", "material escolar", "caderno", "reforco", "reforço", "aula particular", "pos", "pós", "mba",
        "graduacao", "graduação", "udemy", "alura", "hotmart"
    ],
    'extras': [
        "diversos", "outros", "imprevisto", "extra", "avulso", "aleatorio", "aleatório", "coisa", "bagulhinho", "treco"
    ],
    'impostos e taxas': [
        "iptu", "ipva", "ir", "imposto de renda", "darf", "das", "licenciamento", "detran",
        "multa", "multa de transito", "multa de trânsito", "taxa", "cartorio", "cartório", "mei", "simples nacional",
        "prefeitura", "receita federal", "tributo", "taxas"
    ],
    'investimentos': [
        "investi", "investimento", "aporte", "apliquei", "tesouro", "cdb", "lci", "lca", "acoes", "ações",
        "etf", "fii", "fundo", "fundos", "corretora", "xp", "rico", "nuinvest", "binance", "bitget", "crypto", "bitcoin"
    ],
    'lazer': [
        "cinema", "show", "teatro", "bar", "balada", "ingresso", "evento", "passeio", "parque", "viagem", "ferias",
        "férias", "clube", "piscina", "cerveja", "chopp", "drink", "festa"
    ],
    'pets e cuidado': [
        "pet", "pet shop", "petshop", "racao", "ração", "banho e tosa", "veterinario", "veterinário",
        "vacina do pet", "areia", "tapete higienico", "tapete higiênico", "coleira", "brinquedo pet", "gato", "cachorro"
    ],
    'presentes e doacoes': [
        "presente", "lembrancinha", "aniversario", "aniversário", "doacao", "doação", "dizimo", "dízimo",
        "igreja", "ong", "vaquinha", "caridade", "presentinho", "mimo"
    ],
    'saude': [
        "farmacia", "farmácia", "remedio", "remédio", "medicamento",
        "consulta", "medico", "médico", "exame", "laboratorio", "laboratório",
        "dentista", "psicologo", "psicólogo", "terapia", "fisioterapia", "academia", "hospital", "clinica", "clínica",
        "plano de saude", "plano de saúde", "unimed", "bradesco saude", "check-up", "psicologa", "dentaria"
    ],
    'seguros': [
        "seguro", "seguro do carro", "seguro automovel", "seguro automóvel", "seguro residencial", "seguro de vida",
        "seguro viagem", "assistencia 24h", "assistência 24h", "proteção veicular", "ituran", "porto seguro", "bradesco seguros"
    ],
    'tecnologia': [
        "celular", "iphone", "tablet", "notebook", "computador", "pc", "monitor", "mouse", "teclado", "impressora",
        "assistencia tecnica", "assistência técnica", "conserto do celular", "hardware", "eletronico", "eletrônico",
        "carregador", "fone de ouvido", "headset", "gamer", "placa de video", "ssd", "ram"
    ],
    'transporte/veículos': [
        "gasolina", "combustivel", "combustível", "etanol", "alcool", "álcool", "diesel",
        "posto", "abasteci", "abastecimento",
        "uber", "99", "taxi", "táxi", "onibus", "ônibus", "metro", "metrô", "passagem",
        "estacionamento", "zona azul",
        "lava jato", "lavagem", "pneu", "troca de oleo", "troca de óleo", "oficina", "mecanico", "mecânico",
        "revisao", "revisão", "alinhamento", "balanceamento", "bateria", "pedagio", "pedágio", "ipva", "multa"
    ],
    'vestuarios': [
        "roupa", "camisa", "calca", "calça", "sapato", "tenis", "tênis", "vestido", "shopping", "moda",
        "costureira", "conserto de roupa", "loja de roupa", "cueca", "calcinha", "meia", "jaqueta", "blusa", "short",
        "bermuda", "saia", "tenis", "tênis", "sandalia", "sandália", "chinelo"
    ],
    'viagens': [
        "viagem", "hotel", "pousada", "airbnb", "passagem", "voo", "aereo", "aéreo", "milhas",
        "aluguel de carro", "transfer", "tour", "excursao", "excursão", "hospedagem", "turismo", "mala", "passaporte"
    ]
};

const PRIORITY_ORDER = [
    'cartão de credito',
    'viagens',
    'assinaturas',
    'contas',
    'transporte/veículos',
    'compras/mercado',
    'educacao e livros',
    'saude',
    'casa e manutencao',
    'vestuarios',
    'presentes e doacoes',
    'pets e cuidado',
    'impostos e taxas',
    'investimentos',
    'beleza e autocuidado',
    'lazer',
    'seguros',
    'tecnologia',
    'dividas/emprestimos',
    'alimentacao'
];

// Helper to map user display names/slugs to official system IDs
const CATEGORY_MAP: Record<string, string> = {
    'alimentacao': 'cat_alimentacao',
    'alimentação': 'cat_alimentacao',
    'assinaturas': 'cat_assinaturas',
    'beleza e autocuidado': 'cat_beleza',
    'cartão de credito': 'cat_cartao',
    'cartão de crédito': 'cat_cartao',
    'casa e manutencao': 'cat_casa_manut',
    'casa e manutenção': 'cat_casa_manut',
    'compras/mercado': 'cat_mercado',
    'contas': 'cat_contas_casa',
    'dividas/emprestimos': 'cat_dividas',
    'dividas/empréstimos': 'cat_dividas',
    'educacao e livros': 'cat_educacao',
    'educação e livros': 'cat_educacao',
    'extras': 'cat_extras',
    'impostos e taxas': 'cat_impostos',
    'investimentos': 'cat_investimentos',
    'lazer': 'cat_lazer',
    'pets e cuidado': 'cat_pets',
    'presentes e doacoes': 'cat_presentes',
    'presentes e doaçoes': 'cat_presentes',
    'saude': 'cat_saude',
    'saúde': 'cat_saude',
    'seguros': 'cat_seguros',
    'tecnologia': 'cat_tecnologia',
    'transporte/veículos': 'cat_transporte',
    'tranposte/veículos': 'cat_transporte',
    'vestuarios': 'cat_vestuario',
    'vestuários': 'cat_vestuario',
    'viagens': 'cat_viagens'
};

function normalise(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,!?;:]/g, '');
}

function resolveCategoryDeterministic(normText: string): { name: string; confidence: number } {
    for (const catName of PRIORITY_ORDER) {
        const keywords = CATEGORY_KEYWORDS[catName];
        if (keywords && keywords.some(kw => normText.includes(normalise(kw)))) {
            return { name: catName, confidence: 0.95 };
        }
    }
    return { name: 'extras', confidence: 0.2 };
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
    const defaultPM = paymentMethods.find(m => m.id === 'pm_dinheiro') || paymentMethods[0];
    let paymentMethodId = defaultPM?.id;
    let supplierId: string | undefined;
    let confidence = 0.5;

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

        if (aiResult && aiResult.confianca >= 0.8) {
            const mappedId = CATEGORY_MAP[aiResult.categoria];
            const cat = categories.find(c => c.id === mappedId) ||
                categories.find(c => c.id === 'cat_extras') ||
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

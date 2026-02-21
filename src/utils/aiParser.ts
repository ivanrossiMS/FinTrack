import { TransactionType, Category, PaymentMethod, Supplier } from '../models/types';
import { format, subDays, setDate } from 'date-fns';

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

// Words to strip when building the description
const FILLER_WORDS = new Set([
    'reais', 'real', 'conto', 'contos', 'pila', 'pilas',
    'de', 'do', 'da', 'dos', 'das', 'o', 'a', 'os', 'as',
    'um', 'uma', 'uns', 'umas', 'com', 'no', 'na', 'nos', 'nas',
    'em', 'por', 'para', 'pra', 'pro', 'que', 'e', 'ou',
    'hoje', 'ontem', 'anteontem', 'dia', 'mês', 'semana',
    'pix', 'crédito', 'débito', 'cartão', 'dinheiro', 'espécie',
    'recebi', 'ganhei', 'gastei', 'paguei', 'comprei',
    'foi', 'era', 'tava', 'estava', 'fiz', 'foram',
    'ok', 'okay', 'finalizar', 'pronto', 'concluir'
]);

const INCOME_KEYWORDS = ['recebi', 'ganhei', 'salário', 'renda', 'pix recebido', 'venda', 'provento', 'receita'];

const CATEGORY_MAPPINGS: { [key: string]: string[] } = {
    'transporte': ['uber', '99', 'táxi', 'taxi', 'ônibus', 'onibus', 'metrô', 'metro', 'gasolina', 'combustível', 'combustivel', 'carro', 'estacionamento', 'pedágio'],
    'alimentação': ['mercado', 'almoço', 'almoco', 'jantar', 'ifood', 'lanche', 'restaurante', 'padaria', 'fruta', 'verdura', 'café', 'cafe', 'pizza', 'hamburguer', 'sushi', 'supermercado', 'comida', 'feira'],
    'moradia': ['aluguel', 'condomínio', 'condominio', 'luz', 'água', 'agua', 'internet', 'gás', 'gas', 'reforma', 'iptu', 'conta de luz', 'conta de água'],
    'saúde': ['farmácia', 'farmacia', 'médico', 'medico', 'exame', 'dentista', 'remédio', 'remedio', 'hospital', 'consulta', 'plano de saúde'],
    'lazer': ['cinema', 'viagem', 'show', 'bar', 'festa', 'netflix', 'spotify', 'jogos', 'jogo', 'ingresso', 'parque', 'teatro'],
    'educação': ['escola', 'faculdade', 'curso', 'livro', 'mensalidade', 'aula', 'matrícula', 'matricula'],
    'vestuário': ['roupa', 'tênis', 'tenis', 'camisa', 'calça', 'calca', 'sapato', 'loja'],
    'assinatura': ['assinatura', 'plano', 'mensalidade', 'streaming']
};

const PAYMENT_KEYWORDS: { [key: string]: string[] } = {
    'pix': ['pix'],
    'cartão de crédito': ['crédito', 'credito', 'cartão', 'cartao'],
    'cartão de débito': ['débito', 'debito'],
    'dinheiro': ['dinheiro', 'espécie', 'especie', 'cash'],
    'nubank': ['nubank', 'roxinho'],
    'inter': ['inter', 'banco inter'],
    'itaú': ['itaú', 'itau'],
    'bradesco': ['bradesco'],
    'santander': ['santander'],
    'c6': ['c6', 'c6 bank']
};

export const parseTranscription = (
    text: string,
    categories: Category[],
    paymentMethods: PaymentMethod[],
    suppliers: Supplier[]
): ParsedTransaction => {
    const input = text.toLowerCase().trim();
    const words = text.trim().split(/\s+/);

    console.log('[aiParser] Input text:', text);

    // Default values
    let type: TransactionType = 'EXPENSE';
    let description = '';
    let amount = 0;
    let date = format(new Date(), 'yyyy-MM-dd');
    let categoryId = '';
    let paymentMethodId = paymentMethods.length > 0 ? paymentMethods[0].id : undefined;
    let supplierId: string | undefined = undefined;
    let observation = '';
    let confidence = 0.5;

    // 1. Infer Type
    if (INCOME_KEYWORDS.some(kw => input.includes(kw))) {
        type = 'INCOME';
        confidence += 0.1;
    }

    // 2. Extract Amount — look for numbers followed by "reais" first, then any number
    let amountFound = false;

    // Pattern: "40 reais", "40,50 reais", "R$ 40"
    const amountWithUnit = input.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|conto|contos|pila|pilas)?/g);
    if (amountWithUnit) {
        for (const match of amountWithUnit) {
            const numMatch = match.match(/(\d+(?:[.,]\d{1,2})?)/);
            if (numMatch) {
                const val = parseFloat(numMatch[1].replace(',', '.'));
                if (val > 0 && val < 1000000) {
                    amount = val;
                    amountFound = true;
                    confidence += 0.2;
                    break;
                }
            }
        }
    }

    // Handle written numbers
    if (!amountFound) {
        const writtenNumbers: { [key: string]: number } = {
            'um': 1, 'dois': 2, 'três': 3, 'tres': 3, 'quatro': 4, 'cinco': 5,
            'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
            'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'quinze': 15,
            'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
            'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
            'cem': 100, 'cento': 100, 'duzentos': 200, 'trezentos': 300,
            'quinhentos': 500, 'mil': 1000
        };
        for (const [word, value] of Object.entries(writtenNumbers)) {
            if (input.includes(` ${word} reais`) || input.includes(`${word} reais`) || input.endsWith(` ${word}`)) {
                amount = value;
                amountFound = true;
                break;
            }
        }
    }

    // 3. Extract Date
    if (input.includes('ontem')) {
        date = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    } else if (input.includes('anteontem')) {
        date = format(subDays(new Date(), 2), 'yyyy-MM-dd');
    } else {
        const dayMatch = input.match(/dia (\d{1,2})/);
        if (dayMatch) {
            const day = parseInt(dayMatch[1]);
            if (day >= 1 && day <= 31) {
                date = format(setDate(new Date(), day), 'yyyy-MM-dd');
            }
        }
    }

    // 4. Match Category
    let bestCat: Category | undefined;

    for (const [catName, keywords] of Object.entries(CATEGORY_MAPPINGS)) {
        if (keywords.some(kw => input.includes(kw)) || input.includes(catName)) {
            const found = categories.find(c =>
                (c.name.toLowerCase().includes(catName) || catName.includes(c.name.toLowerCase())) &&
                (c.type === type || c.type === 'BOTH')
            );
            if (found) {
                bestCat = found;
                confidence += 0.2;
                break;
            }
        }
    }

    // Fallback: try to match category name directly from user's categories
    if (!bestCat) {
        for (const cat of categories) {
            if (input.includes(cat.name.toLowerCase()) && (cat.type === type || cat.type === 'BOTH')) {
                bestCat = cat;
                confidence += 0.15;
                break;
            }
        }
    }

    // Final fallback: first category of matching type
    if (!bestCat) {
        bestCat = categories.find(c => c.type === type || c.type === 'BOTH');
    }

    if (bestCat) categoryId = bestCat.id;

    // 5. Match Payment Method
    for (const [methodName, keywords] of Object.entries(PAYMENT_KEYWORDS)) {
        if (keywords.some(kw => input.includes(kw))) {
            const found = paymentMethods.find(m =>
                m.name.toLowerCase().includes(methodName) ||
                keywords.some(kw => m.name.toLowerCase().includes(kw))
            );
            if (found) {
                paymentMethodId = found.id;
                confidence += 0.1;
                break;
            }
        }
    }

    // 6. Match Supplier
    for (const supplier of suppliers) {
        if (input.includes(supplier.name.toLowerCase())) {
            supplierId = supplier.id;
            confidence += 0.1;
            break;
        }
    }

    // 7. Build Description — keep meaningful words, skip filler and numbers
    const amountStr = amount.toString();
    const descWords = words.filter(w => {
        const lower = w.toLowerCase().replace(/[.,!?;:]/g, '');
        if (FILLER_WORDS.has(lower)) return false;
        if (lower === amountStr) return false;
        if (/^\d+([.,]\d{1,2})?$/.test(lower)) return false;
        if (lower.length <= 1) return false;
        return true;
    });

    if (descWords.length > 0) {
        description = descWords.slice(0, 5).join(' ');
        // Capitalize first letter
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    // If description is still empty, use the original transcription cleaned up
    if (!description && text.trim().length > 0) {
        description = text.trim().split(/\s+/).slice(0, 4).join(' ');
        description = description.charAt(0).toUpperCase() + description.slice(1);
    }

    // Final validation
    let needsClarification = false;
    let question = '';

    if (amount === 0) {
        needsClarification = true;
        question = 'Qual o valor do lançamento?';
    }

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    const result: ParsedTransaction = {
        type,
        description: description || 'Novo Lançamento',
        amount,
        date,
        categoryId,
        paymentMethodId,
        supplierId,
        observation,
        confidence,
        needsClarification,
        question
    };

    console.log('[aiParser] Result:', result);
    return result;
};

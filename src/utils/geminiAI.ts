// ─────────────────────────────────────────────────────────────────────────────
// Gemini AI utility — direct REST fetch, no npm package needed
// Set VITE_GEMINI_API_KEY in your .env file to enable.
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// System persona injected into every request
const SYSTEM_PROMPT = `Você é o Engenheiro de Machine Learning e Consultor Monetário de Elite do FinTrack.
Sua inteligência é de nível superior, capaz de processar linguagem natural complexa e transformá-la em dados financeiros precisos.
Responda em Português Brasileiro, de forma executiva, perspicaz e extremamente útil.
Seu foco é otimizar a vida financeira do usuário através das seções: Dashboard, Lançamentos, Compromissos, Economia, Relatórios e Cadastros.
Para análises, seja cirúrgico: use os dados reais do contexto para fornecer insights que tragam liberdade financeira.
Seja CONCISO: no máximo 3 frases curtidas e diretas. Não use markdown.`;

export interface FinancialContext {
    monthlyExpenses?: number;
    monthlyIncome?: number;
    balance?: number;
    topCategory?: string;
    pendingCommitments?: number;
    availableCapital?: number;
    currency?: string;
}

export interface InvestmentRecommendation {
    category: string;
    title: string;
    description: string;
    allocation: string; // e.g. "40%"
    products: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export async function askGemini(
    question: string,
    financialContext?: FinancialContext
): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey) {
        return fallbackAnswer(question);
    }

    // Build a context-enriched user message
    let userMessage = question;
    if (financialContext && Object.keys(financialContext).length > 0) {
        const ctx: string[] = [];
        if (financialContext.monthlyIncome !== undefined) ctx.push(`Receita mensal: R$${financialContext.monthlyIncome.toFixed(2)}`);
        if (financialContext.monthlyExpenses !== undefined) ctx.push(`Gastos mensais: R$${financialContext.monthlyExpenses.toFixed(2)}`);
        if (financialContext.balance !== undefined) ctx.push(`Saldo: R$${financialContext.balance.toFixed(2)}`);
        if (financialContext.availableCapital !== undefined) ctx.push(`Capital parado (livre): R$${financialContext.availableCapital.toFixed(2)}`);
        if (financialContext.topCategory) ctx.push(`Categoria com mais gastos: ${financialContext.topCategory}`);
        if (financialContext.pendingCommitments !== undefined) ctx.push(`Compromissos pendentes: ${financialContext.pendingCommitments}`);

        if (ctx.length > 0) {
            userMessage = `[Dados Reais do Usuário: ${ctx.join(' | ')}]\n\nResponda de forma analítica e prestativa à pergunta: ${question}. Se o usuário perguntar de saldo parado ou investimento, use o dado de 'Capital parado' mencionado acima.`;
        }
    }

    try {
        const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                contents: [
                    { role: 'user', parts: [{ text: userMessage }] }
                ],
                generationConfig: {
                    temperature: 0.6,
                    topP: 0.8,
                    maxOutputTokens: 200,
                    stopSequences: [],
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
                ],
            }),
        });

        if (!response.ok) {
            return fallbackAnswer(question);
        }

        const data = await response.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text?.trim()) {
            return 'Estou à disposição para ajudar com suas finanças no FinTrack. Como posso ser útil?';
        }

        return text
            .replace(/\*\*(.+?)\*\*/g, '$1')
            .replace(/\*(.+?)\*/g, '$1')
            .replace(/`(.+?)`/g, '$1')
            .replace(/#{1,6}\s/g, '')
            .replace(/[-*•]\s/g, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, ' ')
            .trim();

    } catch (err) {
        return 'Para dúvidas sobre o sistema, verifique sua conexão ou tente novamente em instantes.';
    }
}

// ── Semantic Transaction Parsing ───────────────────────────────────────────
export interface AIParseResult {
    tipo: 'RECEITA' | 'DESPESA';
    descricao: string;
    valor: number | null;
    categoria: string;
    metodo_pagamento: string;
    parcelas: number | null;
    texto_original: string;
    confianca: number;
    precisa_confirmacao: boolean;
    motivo: string;
}

export async function parseTransactionWithAI(
    text: string,
    examples: any[] = []
): Promise<AIParseResult | null> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) return null;

    const examplesText = examples.length > 0
        ? examples.map(ex => `Entrada: "${ex.transcript}" -> Saída: ${JSON.stringify(ex.final_json)}`).join('\n')
        : 'Nenhum exemplo adicional disponível.';

    const GOLDEN_EXAMPLES = `
- "paguei 120 de internet no pix ontem": {"tipo": "DESPESA", "valor": 120, "categoria": "contas", "metodo_pagamento": "pix", "parcelas": null, "descricao": "Internet", "confianca": 0.98}
- "gasolina 200 no credito": {"tipo": "DESPESA", "valor": 200, "categoria": "transporte/veículos", "metodo_pagamento": "cartao  de credito", "parcelas": null, "descricao": "Gasolina", "confianca": 0.98}
- "recebi 1500 do joao no pix": {"tipo": "RECEITA", "valor": 1500, "categoria": "extras", "metodo_pagamento": "pix", "parcelas": null, "descricao": "Recebimento João", "confianca": 0.95}
- "mercado 250 em 3x": {"tipo": "DESPESA", "valor": 250, "categoria": "compras/mercado", "metodo_pagamento": "cartao  de credito", "parcelas": 3, "descricao": "Mercado", "confianca": 0.99}
`;

    const prompt = `Atue como um Engenheiro(a) de Machine Learning e Analista Financeiro de Elite.
Sua missão é extrair dados de um lançamento financeiro falado (transcrito) e classificar OBRIGATORIAMENTE em uma das categorias e métodos permitidos.

REGRAS DE OURO:
1. CATEGORIA: Deve ser uma dessas 21 strings exatas:
   alimentacao, assinaturas, beleza e autocuidado, cartão de credito, casa e manutencao, compras/mercado, contas, dividas/emprestimos, educacao e livros, extras, impostos e taxas, investimentos, lazer, pets e cuidado, presentes e doacoes, saude, seguros, tecnologia, transporte/veículos, vestuarios, viagens.

2. MÉTODO DE PAGAMENTO: Deve ser uma dessas 4 strings exatas:
   pix, cartao  de debito, cartao  de credito, dinheiro.

3. PARCELAMENTO: Se detectar "em Nx" ou "parcelado", use metodo_pagamento="cartao  de credito" e preencha "parcelas" com o número.

4. PRIORIDADES:
   - "fatura/nubank" -> categoria="cartão de credito"
   - "gasolina/posto" -> categoria="transporte/veículos"
   - "internet/luz/agua" -> categoria="contas"
   - "netflix/spotify" -> categoria="assinaturas"

FORMATO DE SAÍDA (JSON PURO):
{
  "tipo": "RECEITA" | "DESPESA",
  "valor": number | null,
  "categoria": "string_exata",
  "metodo_pagamento": "string_exata",
  "parcelas": number | null,
  "descricao": "string",
  "confianca": number (0-1),
  "precisa_confirmacao": boolean,
  "motivo": "string"
}

CONJUNTO DE DADOS GOLDEN:
${GOLDEN_EXAMPLES}

EXEMPLOS DE APRENDIZADO DO USUÁRIO (HISTÓRICO):
${examplesText}

TEXTO FALADO: "${text}"`;

    try {
        const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 300,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) return null;

        const data = await response.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) return null;

        return JSON.parse(jsonText) as AIParseResult;
    } catch (err) {
        console.error('[geminiAI] AI Parse Error:', err);
        return null;
    }
}

export async function getInvestmentRecommendations(
    availableCapital: number
): Promise<InvestmentRecommendation[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) return [];

    const prompt = `Atue como um Engenheiro de Machine Learning e Consultor Quantitativo de Elite. 
    Com base em um capital disponível de R$ ${availableCapital.toFixed(2)}, gere uma estratégia de alocação de investimentos diversificada.
    
    ### Regras de Negócio:
    1. Se o valor for baixo(<R$ 1.000), foque 100 % em Reserva de Emergência.
    2. Se o valor for médio(R$ 1.000 a R$ 10.000), sugira 70 % Pós - fixado e 30 % Inflação ou Multimercado.
    3. Se o valor for alto(> R$ 10.000), sugira uma carteira completa: Renda Fixa, FIIs e uma pequena parcela em Renda Variável / Cripto.

    Retorne APENAS um JSON Array seguindo este formato de exemplo:
    [
        {
            "category": "Conservador",
            "title": "Reserva de Emergência",
            "description": "Foco total em liquidez diária e segurança para cobrir imprevistos.",
            "allocation": "60%",
            "products": ["Tesouro Selic", "CDB 100% CDI", "Fundo DI"],
            "riskLevel": "LOW"
        }
    ]
    
    Gere 3 ou 4 cards de recomendações.`;

    try {
        const response = await fetch(`${GEMINI_API_BASE}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1000,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) return [];

        const data = await response.json();
        const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) return [];

        return JSON.parse(jsonText);
    } catch (err) {
        console.error('[geminiAI] Recommendation Error:', err);
        return [];
    }
}

// ── Refocused local fallback ────────────────────────────────────────────────
function fallbackAnswer(question: string): string {
    const q = question.toLowerCase();

    if (/\boi\b|ol[aá]|bom dia|boa tarde|boa noite/.test(q)) {
        return 'Olá! Sou o Especialista IA do FinTrack. Posso te ajudar a navegar pelo app ou analisar seus gastos. O que deseja fazer?';
    }

    if (/como.*usar|ajuda|funciona/.test(q)) {
        return 'Você pode registrar gastos por voz, ver relatórios ou gerenciar seus compromissos. Diga algo como "Lançamentos" para navegar.';
    }

    if (/\d+\s*[+\-*/]\s*\d+/.test(q)) {
        try {
            const expr = q.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
            if (expr) {
                const a = parseFloat(expr[1]), op = expr[2], b = parseFloat(expr[3]);
                const r = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b !== 0 ? a / b : null;
                if (r !== null) return `O resultado da conta é ${r}.`;
            }
        } catch { /* ignore */ }
    }

    return 'Como assistente do FinTrack, sou focado em suas finanças e no uso deste aplicativo. Posso te ajudar com alguma tela ou dado financeiro?';
}

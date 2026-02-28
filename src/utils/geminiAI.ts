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
    valor: number;
    categoria: string;
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
        ? examples.map(ex => `Entrada: "${ex.transcript}" -> Saída: ${JSON.stringify({
            tipo: ex.type === 'INCOME' ? 'RECEITA' : 'DESPESA',
            valor: ex.amount,
            categoria: ex.category_name || ex.categoryId,
            descricao: ex.description
        })}`).join('\n')
        : 'Nenhum exemplo adicional disponível.';

    const GOLDEN_EXAMPLES = `
- "recebi quinhentos reais de bonus": {"tipo": "RECEITA", "valor": 500, "categoria": "extras", "descricao": "Bônus recebido", "confianca": 0.95}
- "paguei a fatura do nubank 1200": {"tipo": "DESPESA", "valor": 1200, "categoria": "cartão de crédito", "descricao": "Fatura Nubank", "confianca": 0.98}
- "aluguel mil e duzentos": {"tipo": "DESPESA", "valor": 1200, "categoria": "contas", "descricao": "Aluguel", "confianca": 0.95}
- "cinquenta reais de gasolina": {"tipo": "DESPESA", "valor": 50, "categoria": "transporte/veículos", "descricao": "Gasolina", "confianca": 0.98}
- "compra no carrefour 350": {"tipo": "DESPESA", "valor": 350, "categoria": "compras/mercado", "descricao": "Compra Carrefour", "confianca": 0.95}
- "vendi meu celular por 800": {"tipo": "RECEITA", "valor": 800, "categoria": "extras", "descricao": "Venda de celular", "confianca": 0.90}
- "mensalidade da netflix": {"tipo": "DESPESA", "valor": null, "categoria": "assinaturas", "descricao": "Netflix", "confianca": 0.99}
- "comi um bauru de 25 reais": {"tipo": "DESPESA", "valor": 25, "categoria": "alimentação", "descricao": "Lanche/Bauru", "confianca": 0.95}
- "consulta no dentista 200": {"tipo": "DESPESA", "valor": 200, "categoria": "saúde", "descricao": "Dentista", "confianca": 0.98}
- "depositei 100 na poupança": {"tipo": "DESPESA", "valor": 100, "categoria": "investimentos", "descricao": "Depósito Poupança", "confianca": 0.92}
`;

    const prompt = `Atue como um Engenheiro(a) de Machine Learning e Analista Financeiro de Elite.
Sua missão é extrair dados de um lançamento financeiro falado (transcrito) e classificar OBRIGATORIAMENTE em uma das 21 categorias permitidas.

REGRAS DE OURO:
1. Prioridade Extrema: Cartão de Crédito sempre vence se houver termos como "fatura" ou nomes de bancos.
2. Descrição Limpa: Remova termos como "paguei", "gastei", "comprei" da descrição final.
3. Inteligência de Valor: Entenda "cinquenta reais" como 50 e "mil e duzentos" como 1200.

LISTA OBRIGATÓRIA DE CATEGORIAS:
1) alimentação
2) assinaturas
3) beleza e autocuidado
4) cartão de crédito
5) casa e manutenção
6) compras/mercado
7) contas
8) dividas/empréstimos
9) educação e livros
10) extras
11) impostos e taxas
12) investimentos
13) lazer
14) pets e cuidado
15) presentes e doaçoes
16) saúde
17) seguros
18) tecnologia
19) transporte/veículos
20) vestuários
21) viagens

REGRAS DE CLASSIFICAÇÃO (PRIORIDADE):
1. Cartão de Crédito: se citar "fatura", "anuidade", "nubank", "inter card", etc.
2. Viagens: se citar "hotel", "airbnb", "passagem aérea", "turismo".
3. Assinaturas: se citar "netflix", "spotify", "mensalidade de app", "disney".
4. Contas: se citar "luz", "água", "internet", "gás", "boletos fixos", "aluguel".
5. transporte/veículos: se citar "gasolina", "uber", "99", "oficina", "combustível".
6. Educação e Livros: se citar "curso", "faculdade", "escola", "livro".
7. Alimentação: se citar "comida", "ifood", "almoço", "jantar", "restaurante".
8. Compras/Mercado: se citar "mercado", "supermercado", "compras do mês".
9. Se for incerto ou ambíguo -> "extras".

REGRAS GERAIS:
- TIPO: Sempre "RECEITA" ou "DESPESA".
- VALOR: Número puro. Se não falado, use null.
- DESCRICAO: Curta e limpa (ex: "Almoço no Shopping").
- CONFIANÇA: 0.0 a 1.0. Se a categoria for baseada em regra clara, use > 0.9.
- PRECISA_CONFIRMACAO: true se o valor for nulo ou a categoria for "extras".

CONJUNTO DE DADOS GOLDEN (REFERÊNCIA):
${GOLDEN_EXAMPLES}

EXEMPLOS DE APRENDIZADO DO USUÁRIO (HISTÓRICO):
${examplesText}

TEXTO FALADO: "${text}"

FORMATO DE SAÍDA (JSON PURO):
{
  "texto_original": "${text}",
  "valor": number | null,
  "tipo": "RECEITA" | "DESPESA",
  "categoria": "nome_da_categoria_escolhida",
  "descricao": "breve descrição",
  "confianca": number,
  "precisa_confirmacao": boolean,
  "motivo": "explicação curta"
}`;

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

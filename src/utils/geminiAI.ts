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
    categories: string[]
): Promise<AIParseResult | null> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) return null;

    const prompt = `Atue como o melhor programador e Engenheiro(a) de Machine Learning (Machine Learning Engineer) e um classificador inteligente de lançamentos financeiros de um app pessoal.

Sua função é analisar uma frase curta em português falada no assistente IA, extrair o valor e classificar o lançamento em UMA categoria existente do sistema.

REGRAS GERAIS:
1) Nunca invente categorias fora da lista.
2) Sempre retorne exatamente um tipo: "RECEITA" ou "DESPESA".
3) Sempre retorne exatamente uma categoria do tipo escolhido.
4) Quando não identificar a categoria com confiança, use:
   - DESPESA -> "Extras"
   - RECEITA -> "Rendimentos"
5) Se houver conflito entre palavras, priorize a palavra mais específica. Ex: "farmácia pet" -> "Pets & Cuidado"
6) Aceite erros de digitação, abreviações e fala informal.
7) Se o valor não estiver claro, tente extrair mesmo assim. Se não conseguir, retorne valor = null.
8) Se a frase não indicar claramente se é receita ou despesa, use contexto da palavra-chave.
9) Se ainda ambíguo, assumir DESPESA e categoria "Extras".

TEXTO FALADO: "${text}"

CATEGORIAS DISPONÍVEIS (USE APENAS ESTAS):
${categories.join(', ')}

MAPEAMENTO DE REFERÊNCIA (PALAVRAS-CHAVE):

### RECEITAS
"Bônus / 13°": bonus, 13, decimo terceiro, gratificação
"Comissões": comissão, percentual, comissionamento
"Prêmios / Sorteios": premio, sorteio, recompensa
"Reembolsos": reembolso, ressarcimento, reembolsaram
"Renda de Aluguel": aluguel recebido, inquilino pagou
"Rendimentos": rendimento, juros, dividendos, lucro investimento, cdi, poupança, cashback
"Restituição / Devoluções": restituição, devolução, estorno
"Salário": salário, pagamento empresa, folha, holerite, adiantamento
"Serviços / Consultorias": serviço prestado, consultoria, honorário, freela, projeto
"Vendas": venda, vendi, cliente pagou, produto vendido

### DESPESAS
"Alimentação": mercado, padaria, restaurante, almoço, jantar, lanche, ifood, delivery, comida, café
"Assinaturas": assinatura, mensalidade app, netflix, spotify, prime, chatgpt, icloud
"Beleza & Autocuidado": salão, barbearia, manicure, skincare, estética, cabelo
"Cartão de Crédito": cartão, fatura, cartão de crédito
"Casa & Manutenção": manutenção casa, reparo, móveis, material construção
"Compras / Mercado Extra": compra extra, comprinhas, conveniência, utilidades
"Contas": água, luz, internet, wifi, gás, condomínio, aluguel, iptu, boleto
"Dívidas & Empréstimos": dívida, empréstimo, financiamento, parcela banco
"Educação & Livros": escola, faculdade, curso, livro, apostila, inglês, estudo
"Extras": use para baixíssima confiança
"Impostos & Taxas": imposto, taxa, darf, das, inss, ir, ipva, licenciamento, multa
"Investimentos": aporte, investimento, investir, compra ações, tesouro, corretora
"Lazer": cinema, show, passeio, festa, bar, games, jogo, hobby
"Pets & Cuidado": pet, ração, veterinário, banho e tosa, remédio pet
"Presentes & Doações": presente, doação, ajuda, mimo
"Saúde": academia, farmácia, remédio, consulta, médico, dentista, exame, terapia, plano de saúde
"Seguros": seguro, seguro carro, seguro vida, apólice
"Tecnologia": celular, notebook, hardware, software, licença, hospedagem
"Transporte / Veículos": gasolina, combustível, uber, taxi, ônibus, metrô, estacionamento, pedágio, oficina
"Vestuário": roupa, camisa, calça, tênis, sapato, bolsa
"Viagens": viagem, passagem, hotel, hospedagem, aérea, avião, airbnb

FORMATO DE SAÍDA (JSON PURO):
{
  "texto_original": "${text}",
  "valor": number,
  "tipo": "RECEITA" | "DESPESA",
  "categoria": "nome exato da categoria",
  "descricao": "descrição curta normalizada",
  "confianca": number (0.0 to 1.0),
  "precisa_confirmacao": boolean,
  "motivo": "resumo curto"
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
        return 'Olá! Sou o Especialista IA do Finance+. Posso te ajudar a navegar pelo app ou analisar seus gastos. O que deseja fazer?';
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

    return 'Como assistente do Finance+, sou focado em suas finanças e no uso deste aplicativo. Posso te ajudar com alguma tela ou dado financeiro?';
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini AI utility — direct REST fetch, no npm package needed
// Set VITE_GEMINI_API_KEY in your .env file to enable.
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// System persona injected into every request
const SYSTEM_PROMPT = `Você é o Especialista IA do FinTrack — um assistente financeiro pessoal de elite, focado exclusivamente em ajudar o usuário com as funcionalidades deste aplicativo.
Você responde em Português Brasileiro, de forma clara, prestativa e extremamente inteligente.
Recuse educadamente responder quaisquer perguntas que não sejam relacionadas ao FinTrack, finanças pessoais, economia ou ao uso do sistema.
Se o usuário perguntar algo genérico (como história, ciência ou fofocas), responda que você é especializado no FinTrack e sugira uma funcionalidade do app.
Seu objetivo é guiar o usuário pelas seções (Dashboard, Lançamentos, Compromissos, Economia, Relatórios, Cadastros) e responder dúvidas sobre seus dados financeiros.
Para perguntas financeiras, use os dados do contexto de forma analítica e perspicaz.
Seja CONCISO: no máximo 3 frases. Não use markdown ou listas.`;

export interface FinancialContext {
    monthlyExpenses?: number;
    monthlyIncome?: number;
    balance?: number;
    topCategory?: string;
    pendingCommitments?: number;
    currency?: string;
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
        if (financialContext.topCategory) ctx.push(`Categoria com mais gastos: ${financialContext.topCategory}`);
        if (financialContext.pendingCommitments !== undefined) ctx.push(`Compromissos pendentes: ${financialContext.pendingCommitments}`);
        if (ctx.length > 0) {
            userMessage = `[Contexto financeiro do usuário: ${ctx.join(' | ')}]\n\nPergunta: ${question}`;
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

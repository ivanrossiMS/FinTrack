import { format, subDays, subMonths, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AppData } from '../models/types';

// ─────────────────────────────────────────────────────────────────────────────
// Intent types
// ─────────────────────────────────────────────────────────────────────────────
export type IntentType = 'navigate' | 'transaction' | 'commitment' | 'query' | 'help' | 'unknown';

export interface VoiceIntent {
    type: IntentType;
    confidence: number;
    route?: string;
    queryKey?: QueryKey;
    rawText: string;
}

export type QueryKey =
    | 'commitments_today'
    | 'commitments_overdue'
    | 'commitments_week'
    | 'commitments_month'
    | 'commitments_pending_total'
    | 'balance_month'
    | 'balance_week'
    | 'expenses_month'
    | 'expenses_week'
    | 'income_month'
    | 'last_transaction'
    | 'last_transactions'
    | 'savings_goals'
    | 'top_expenses'
    | 'top_category'
    | 'transaction_count'
    | 'budget_status'
    | 'greeting';

// ─────────────────────────────────────────────────────────────────────────────
// SITE KNOWLEDGE — Navigation routes
// ─────────────────────────────────────────────────────────────────────────────
const ROUTES: { keywords: string[]; path: string; label: string }[] = [
    {
        path: '/',
        label: 'Dashboard',
        keywords: [
            'dashboard', 'início', 'inicio', 'home', 'principal', 'painel',
            'página inicial', 'pagina inicial', 'tela inicial', 'visão geral', 'visao geral',
        ],
    },
    {
        path: '/transactions',
        label: 'Lançamentos',
        keywords: [
            'lançamento', 'lançamentos', 'lancamento', 'lancamentos',
            'transação', 'transações', 'transacao', 'transacoes',
            'gasto', 'gastos', 'receita', 'receitas', 'extrato', 'movimentação',
            'financeiro', 'fluxo de caixa', 'entradas e saídas',
        ],
    },
    {
        path: '/commitments',
        label: 'Compromissos',
        keywords: [
            'compromisso', 'compromissos', 'vencimento', 'vencimentos',
            'boleto', 'boletos', 'conta a pagar', 'contas a pagar',
            'conta a receber', 'contas a receber', 'fatura', 'faturas',
            'agenda', 'agenda financeira', 'dívida', 'divida',
        ],
    },
    {
        path: '/savings',
        label: 'Economia / Metas',
        keywords: [
            'economia', 'economias', 'poupança', 'poupanca', 'meta', 'metas',
            'saving', 'savings', 'objetivo', 'objetivos', 'reserva', 'fundo',
            'fundo de emergência', 'fundo emergencia',
        ],
    },
    {
        path: '/reports',
        label: 'Relatórios',
        keywords: [
            'relatório', 'relatórios', 'relatorio', 'relatorios',
            'report', 'reports', 'análise', 'analise', 'gráfico', 'grafico',
            'resumo', 'estatística', 'estatisticas', 'demonstrativo',
        ],
    },
    {
        path: '/manage',
        label: 'Cadastros',
        keywords: [
            'cadastro', 'cadastros', 'categoria', 'categorias', 'gerenciar',
            'fornecedor', 'fornecedores', 'método de pagamento', 'metodo de pagamento',
            'forma de pagamento', 'manage', 'configurar categorias', 'gerenciar categorias',
        ],
    },
    {
        path: '/profile',
        label: 'Perfil',
        keywords: [
            'perfil', 'profile', 'meu perfil', 'conta', 'minha conta',
            'configurações da conta', 'informações pessoais', 'dados pessoais',
        ],
    },
    {
        path: '/admin',
        label: 'Admin',
        keywords: [
            'admin', 'administração', 'administracao', 'administrador',
            'painel admin', 'painel de administração', 'gerenciar usuários',
        ],
    },
];

// Navigation trigger phrases
const NAV_TRIGGERS = [
    'ir para', 'ir pra', 'abrir', 'mostrar', 'ver', 'navegar', 'navegar para',
    'me leve', 'me levar', 'quero ver', 'quero ir', 'acessar', 'vá para',
    'va para', 'vai para', 'vai pra', 'abre', 'mostra', 'exibir', 'entrar em',
    'acessar a página', 'abrir a página', 'me mostra', 'quero acessar',
];

// ─────────────────────────────────────────────────────────────────────────────
// Transaction trigger words/patterns
// ─────────────────────────────────────────────────────────────────────────────
const TRANSACTION_TRIGGERS = [
    'gastei', 'paguei', 'comprei', 'recebi', 'ganhei', 'transferi',
    'saiu', 'entrou', 'lançar', 'lancar', 'adicionar lançamento',
    'novo lançamento', 'registrar', 'registrar gasto', 'registrar receita',
    'anotar', 'botar no caixa', 'colocar no caixa', 'jogar no caixa',
    'fiz uma compra', 'fiz uma venda', 'vendi', 'recebi pagamento',
    'paguei uma conta', 'efetuei pagamento',
];

// ─────────────────────────────────────────────────────────────────────────────
// Commitment trigger words/patterns
// ─────────────────────────────────────────────────────────────────────────────
const COMMITMENT_TRIGGERS = [
    'criar compromisso', 'novo compromisso', 'adicionar compromisso',
    'criar boleto', 'novo boleto', 'adicionar boleto',
    'criar conta a pagar', 'nova conta a pagar', 'criar fatura',
    'lembrar pagar', 'agendar pagamento', 'agendar compromisso',
    'compromisso de', 'vencimento de', 'devo pagar', 'vence dia',
    'tenho que pagar', 'tenho um boleto', 'tenho uma conta',
    'agendar conta', 'registrar compromisso', 'marcar pagamento',
];

// ─────────────────────────────────────────────────────────────────────────────
// Query patterns mapped to keys
// ─────────────────────────────────────────────────────────────────────────────
const QUERY_PATTERNS: { patterns: string[]; key: QueryKey }[] = [
    // ── Greetings / site explanation ──────────────────────────────
    {
        key: 'greeting',
        patterns: [
            'olá', 'oi', 'ola', 'bom dia', 'boa tarde', 'boa noite',
            'o que você faz', 'o que voce faz', 'o que é isso',
            'como funciona', 'me explique', 'quem é você', 'quem e voce',
            'apresente o sistema', 'quais funções', 'quais funcoes',
            'o que posso fazer', 'me ajude', 'instruções', 'instrucoes',
        ],
    },

    // ── Commitments: TODAY ────────────────────────────────────────
    {
        key: 'commitments_today',
        patterns: [
            'vencimento hoje', 'vencimentos hoje', 'vencem hoje',
            'contas hoje', 'contas para hoje', 'conta para pagar hoje',
            'o que vence hoje', 'o que tenho hoje', 'tenho contas hoje',
            'compromisso hoje', 'compromissos hoje', 'pagar hoje',
            'o que preciso pagar hoje', 'quais são meus compromissos hoje',
            'tem algo vencendo hoje', 'tem conta hoje',
        ],
    },

    // ── Commitments: OVERDUE ──────────────────────────────────────
    {
        key: 'commitments_overdue',
        patterns: [
            'conta vencida', 'contas vencidas', 'atrasada', 'atrasadas',
            'venceu', 'venceram', 'em atraso', 'atraso',
            'compromisso vencido', 'compromissos vencidos',
            'tenho contas vencidas', 'tenho alguma conta vencida',
            'o que está atrasado', 'o que esta atrasado',
            'tenho atraso', 'minhas pendências', 'minhas pendencias',
        ],
    },

    // ── Commitments: THIS WEEK ───────────────────────────────────
    {
        key: 'commitments_week',
        patterns: [
            'vencimentos da semana', 'contas da semana', 'essa semana',
            'compromissos da semana', 'o que vence essa semana',
            'vence essa semana', 'vencem essa semana', 'semana atual',
            'o que pagar essa semana', 'contas para essa semana',
        ],
    },

    // ── Commitments: THIS MONTH ──────────────────────────────────
    {
        key: 'commitments_month',
        patterns: [
            'vencimentos do mês', 'contas do mês', 'compromissos do mês',
            'o que vence esse mês', 'vence esse mês', 'esse mês de contas',
            'o que pagar esse mês', 'contas para esse mês',
            'minhas contas do mês',
        ],
    },

    // ── Commitments: total pending ───────────────────────────────
    {
        key: 'commitments_pending_total',
        patterns: [
            'total de compromissos', 'total a pagar', 'quanto devo',
            'total das contas', 'quantos compromissos tenho',
            'quanto tenho a pagar', 'valor total das contas',
            'soma das contas', 'total pendente',
        ],
    },

    // ── Balance: MONTH ───────────────────────────────────────────
    {
        key: 'balance_month',
        patterns: [
            'saldo', 'saldo do mês', 'saldo esse mês', 'saldo este mês',
            'meu saldo', 'balanço', 'balanco', 'resultado do mês',
            'resultado esse mês', 'como estou financeiramente',
            'sobrou quanto', 'quanto sobrou', 'minha situação financeira',
            'situacao financeira', 'como estão minhas finanças',
            'como estao minhas financas', 'saldo atual',
        ],
    },

    // ── Balance: WEEK ────────────────────────────────────────────
    {
        key: 'balance_week',
        patterns: [
            'saldo da semana', 'resultado da semana', 'balanço da semana',
            'saldo semanal', 'essa semana saldo', 'quanto entrou essa semana',
        ],
    },

    // ── Expenses: THIS MONTH ─────────────────────────────────────
    {
        key: 'expenses_month',
        patterns: [
            'quanto gastei', 'total de gastos', 'gastos do mês',
            'gastos esse mês', 'despesas do mês', 'despesas esse mês',
            'total gasto', 'quanto saiu', 'saída do mês', 'saidas do mes',
            'o que gastei', 'meus gastos', 'total de despesas',
            'quanto eu gastei', 'gastei quanto', 'minhas despesas',
        ],
    },

    // ── Expenses: THIS WEEK ──────────────────────────────────────
    {
        key: 'expenses_week',
        patterns: [
            'quanto gastei essa semana', 'gastos da semana',
            'despesas da semana', 'o que gastei essa semana',
            'saídas da semana', 'saidas da semana',
        ],
    },

    // ── Income: THIS MONTH ───────────────────────────────────────
    {
        key: 'income_month',
        patterns: [
            'quanto recebi', 'total de receitas', 'receitas do mês',
            'receitas esse mês', 'quanto entrou', 'entrada do mês',
            'renda do mês', 'ganhos do mês', 'minha renda',
            'total de entradas', 'recebi quanto', 'quanto ganhei',
            'minhas receitas', 'total recebido',
        ],
    },

    // ── Last transaction ─────────────────────────────────────────
    {
        key: 'last_transaction',
        patterns: [
            'última transação', 'ultima transacao',
            'último lançamento', 'ultimo lancamento',
            'último gasto', 'ultimo gasto', 'o que eu gastei por último',
            'última movimentação', 'ultima movimentacao',
            'meu último registro', 'ultimo registro',
        ],
    },

    // ── Recent transactions ──────────────────────────────────────
    {
        key: 'last_transactions',
        patterns: [
            'últimas transações', 'ultimas transacoes',
            'últimos lançamentos', 'ultimos lancamentos',
            'últimos gastos', 'ultimos gastos',
            'histórico recente', 'historico recente',
            'o que fiz recentemente', 'movimentações recentes',
            'movimentacoes recentes', 'meus últimos registros',
        ],
    },

    // ── Savings goals ────────────────────────────────────────────
    {
        key: 'savings_goals',
        patterns: [
            'metas de economia', 'metas de poupança', 'minha economia',
            'quantas metas', 'minhas metas', 'status das metas',
            'economia atual', 'progresso das metas', 'minhas poupanças',
            'quanto economizei', 'quanto poupei', 'meu fundo',
            'minhas reservas', 'reserva de emergência', 'reserva emergencia',
        ],
    },

    // ── Top expenses / categories ────────────────────────────────
    {
        key: 'top_expenses',
        patterns: [
            'maior gasto', 'maiores gastos', 'gasto mais alto',
            'top gastos', 'gastos mais altos', 'o que mais gastei',
            'onde mais gastei', 'minha maior despesa',
        ],
    },

    {
        key: 'top_category',
        patterns: [
            'categoria que mais gasei', 'qual categoria mais gastei',
            'categoria mais cara', 'categorias dos gastos',
            'top categoria', 'qual categoria', 'onde está indo meu dinheiro',
            'onde esta indo meu dinheiro',
        ],
    },

    // ── Transaction count ────────────────────────────────────────
    {
        key: 'transaction_count',
        patterns: [
            'quantas transações', 'quantos lançamentos', 'número de transações',
            'numero de transacoes', 'quantos registros', 'quantos gastos registrei',
            'total de lançamentos', 'quantas movimentações',
        ],
    },

    // ── Budget status ────────────────────────────────────────────
    {
        key: 'budget_status',
        patterns: [
            'orçamento', 'orcamento', 'limite de gastos', 'limite do orçamento',
            'estourei o orçamento', 'ultrapassei o limite',
            'quanto posso gastar', 'ainda posso gastar',
            'status do orçamento', 'como está meu orçamento',
        ],
    },
];

const HELP_TRIGGERS = [
    'ajuda', 'help', 'o que posso falar', 'o que você faz', 'o que posso dizer',
    'comandos disponíveis', 'comandos disponiveis', 'instruções', 'instrucoes',
    'como usar', 'tutorial', 'me ensina',
];

// ─────────────────────────────────────────────────────────────────────────────
// Intent detector
// ─────────────────────────────────────────────────────────────────────────────
export function detectIntent(text: string): VoiceIntent {
    const lower = text.toLowerCase().trim();

    // 1. Direct Page Navigation (Exact Match) — PRIORITIZED
    for (const route of ROUTES) {
        if (route.keywords.some(kw => lower === kw || lower === `página ${kw}` || lower === `pagina ${kw}`)) {
            return { type: 'navigate', confidence: 0.98, route: route.path, rawText: text };
        }
    }

    // 2. Help
    if (HELP_TRIGGERS.some(t => lower.includes(t))) {
        return { type: 'help', confidence: 0.95, rawText: text };
    }

    // 3. Query — explicit patterns first
    for (const { key, patterns } of QUERY_PATTERNS) {
        if (patterns.some(p => lower.includes(p))) {
            return { type: 'query', confidence: 0.92, queryKey: key, rawText: text };
        }
    }

    // 4. Navigate — with trigger word
    const hasNavTrigger = NAV_TRIGGERS.some(t => lower.includes(t));
    if (hasNavTrigger) {
        for (const route of ROUTES) {
            if (route.keywords.some(kw => lower.includes(kw))) {
                return { type: 'navigate', confidence: 0.93, route: route.path, rawText: text };
            }
        }
    }

    // 4. Commitment — before transaction since some phrases overlap
    if (COMMITMENT_TRIGGERS.some(t => lower.includes(t))) {
        return { type: 'commitment', confidence: 0.87, rawText: text };
    }

    // 5. Transaction — explicit trigger words
    if (TRANSACTION_TRIGGERS.some(t => lower.includes(t))) {
        return { type: 'transaction', confidence: 0.87, rawText: text };
    }

    // 6. Heuristic: number + money context → likely a transaction
    const hasAmount = /\d+/.test(lower);
    const hasMoneyWord = /(reais|real|r\$|conto|pila|bala)/.test(lower);
    const wordCount = lower.split(' ').length;
    if (hasAmount && hasMoneyWord && wordCount >= 2) {
        return { type: 'transaction', confidence: 0.68, rawText: text };
    }

    return { type: 'unknown', confidence: 0, rawText: text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Currency formatter
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const monthName = (d = new Date()) => format(d, 'MMMM', { locale: ptBR });

// ─────────────────────────────────────────────────────────────────────────────
// Query resolver — reads real app data and generates a spoken answer
// ─────────────────────────────────────────────────────────────────────────────
export function resolveQuery(key: QueryKey, data: AppData): string {
    const today = format(new Date(), 'yyyy-MM-dd');
    const thisMonth = format(new Date(), 'yyyy-MM');
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const commitments = data.commitments || [];
    const savings = data.savingsGoals || [];
    const txs = data.transactions || [];
    const budgets = data.budgets || [];

    switch (key) {
        // ── Greeting / site explanation ───────────────────────────
        case 'greeting': {
            return 'Olá! Sou o Assistente IA do FinTrack. Posso criar lançamentos financeiros, compromissos e metas por voz, navegar pelas páginas do sistema, e responder perguntas sobre suas finanças como saldo do mês, gastos, contas a vencer e muito mais. É só falar!';
        }

        // ── Commitments today ─────────────────────────────────────
        case 'commitments_today': {
            const items = commitments.filter(c => c.dueDate === today && c.status === 'PENDING');
            if (items.length === 0) return 'Você não tem compromissos vencendo hoje. Tudo em dia!';
            const total = items.reduce((s, c) => s + c.amount, 0);
            const names = items.map(c => c.description).join(', ');
            return `Você tem ${items.length} compromisso${items.length > 1 ? 's' : ''} vencendo hoje: ${names}. Total: ${fmt(total)}.`;
        }

        // ── Commitments overdue ───────────────────────────────────
        case 'commitments_overdue': {
            const items = commitments.filter(c => c.dueDate < today && c.status === 'PENDING');
            if (items.length === 0) return 'Parabéns! Você não tem compromissos em atraso.';
            const total = items.reduce((s, c) => s + c.amount, 0);
            const names = items.map(c => c.description).join(', ');
            return `Atenção! Você tem ${items.length} compromisso${items.length > 1 ? 's' : ''} em atraso: ${names}. Total em atraso: ${fmt(total)}.`;
        }

        // ── Commitments this week ─────────────────────────────────
        case 'commitments_week': {
            const items = commitments.filter(c =>
                c.status === 'PENDING' && c.dueDate >= weekStart && c.dueDate <= weekEnd
            );
            if (items.length === 0) return 'Você não tem compromissos vencendo essa semana.';
            const total = items.reduce((s, c) => s + c.amount, 0);
            const names = items.map(c => `${c.description} no dia ${c.dueDate.split('-')[2]}`).join(', ');
            return `Essa semana você tem ${items.length} compromisso${items.length > 1 ? 's' : ''}: ${names}. Total: ${fmt(total)}.`;
        }

        // ── Commitments this month ────────────────────────────────
        case 'commitments_month': {
            const items = commitments.filter(c =>
                c.status === 'PENDING' && c.dueDate.startsWith(thisMonth)
            );
            if (items.length === 0) return `Você não tem compromissos pendentes em ${monthName()}.`;
            const total = items.reduce((s, c) => s + c.amount, 0);
            return `Em ${monthName()} você tem ${items.length} compromisso${items.length > 1 ? 's' : ''} pendente${items.length > 1 ? 's' : ''}. Total a pagar: ${fmt(total)}.`;
        }

        // ── Commitments total pending ─────────────────────────────
        case 'commitments_pending_total': {
            const items = commitments.filter(c => c.status === 'PENDING');
            if (items.length === 0) return 'Você não tem compromissos pendentes. Conta limpa!';
            const total = items.reduce((s, c) => s + c.amount, 0);
            return `Você tem ${items.length} compromisso${items.length > 1 ? 's' : ''} pendente${items.length > 1 ? 's' : ''} no total, somando ${fmt(total)}.`;
        }

        // ── Balance this month ────────────────────────────────────
        case 'balance_month': {
            const monthTxs = txs.filter(t => t.date.startsWith(thisMonth));
            const income = monthTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
            const expense = monthTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
            const balance = income - expense;
            const word = balance >= 0 ? 'positivo' : 'negativo';
            if (monthTxs.length === 0) return `Não há lançamentos em ${monthName()} ainda.`;
            return `Seu saldo em ${monthName()} é ${word}: ${fmt(Math.abs(balance))}. Receitas: ${fmt(income)} | Despesas: ${fmt(expense)}.`;
        }

        // ── Balance this week ─────────────────────────────────────
        case 'balance_week': {
            const weekTxs = txs.filter(t => t.date >= weekStart && t.date <= weekEnd);
            const income = weekTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
            const expense = weekTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
            const balance = income - expense;
            if (weekTxs.length === 0) return 'Nenhum lançamento registrado essa semana.';
            return `Essa semana: receitas ${fmt(income)}, despesas ${fmt(expense)}, saldo ${balance >= 0 ? 'positivo' : 'negativo'} de ${fmt(Math.abs(balance))}.`;
        }

        // ── Expenses this month ───────────────────────────────────
        case 'expenses_month': {
            const expenses = txs.filter(t => t.date.startsWith(thisMonth) && t.type === 'EXPENSE');
            if (expenses.length === 0) return `Nenhuma despesa lançada em ${monthName()} ainda.`;
            const total = expenses.reduce((s, t) => s + t.amount, 0);
            // Compare with last month
            const lastMonthExpenses = txs
                .filter(t => t.date.startsWith(lastMonth) && t.type === 'EXPENSE')
                .reduce((s, t) => s + t.amount, 0);
            const diff = total - lastMonthExpenses;
            const trend = lastMonthExpenses > 0
                ? (diff > 0 ? `, ${fmt(Math.abs(diff))} a mais que no mês passado` : `, ${fmt(Math.abs(diff))} a menos que no mês passado`)
                : '';
            return `Você gastou ${fmt(total)} em ${monthName()}${trend}. Total de ${expenses.length} lançamentos.`;
        }

        // ── Expenses this week ────────────────────────────────────
        case 'expenses_week': {
            const expenses = txs.filter(t => t.date >= weekStart && t.date <= weekEnd && t.type === 'EXPENSE');
            if (expenses.length === 0) return 'Nenhuma despesa lançada essa semana.';
            const total = expenses.reduce((s, t) => s + t.amount, 0);
            return `Essa semana você gastou ${fmt(total)} em ${expenses.length} lançamento${expenses.length > 1 ? 's' : ''}.`;
        }

        // ── Income this month ─────────────────────────────────────
        case 'income_month': {
            const incomes = txs.filter(t => t.date.startsWith(thisMonth) && t.type === 'INCOME');
            if (incomes.length === 0) return `Nenhuma receita lançada em ${monthName()} ainda.`;
            const total = incomes.reduce((s, t) => s + t.amount, 0);
            return `Você recebeu ${fmt(total)} em ${monthName()}, em ${incomes.length} lançamento${incomes.length > 1 ? 's' : ''}.`;
        }

        // ── Last transaction ──────────────────────────────────────
        case 'last_transaction': {
            if (txs.length === 0) return 'Você ainda não tem lançamentos cadastrados.';
            const last = [...txs].sort((a, b) => b.createdAt - a.createdAt)[0];
            const typeWord = last.type === 'INCOME' ? 'receita' : 'despesa';
            const dateStr = format(parseISO(last.date), "d 'de' MMMM", { locale: ptBR });
            return `Seu último lançamento foi uma ${typeWord} de ${fmt(last.amount)}: "${last.description}", em ${dateStr}.`;
        }

        // ── Last 3 transactions ───────────────────────────────────
        case 'last_transactions': {
            if (txs.length === 0) return 'Você ainda não tem lançamentos cadastrados.';
            const last3 = [...txs].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
            const list = last3.map(t => {
                const word = t.type === 'INCOME' ? '+' : '-';
                return `${word}${fmt(t.amount)} em ${t.description}`;
            }).join('; ');
            return `Seus últimos lançamentos: ${list}.`;
        }

        // ── Savings goals ─────────────────────────────────────────
        case 'savings_goals': {
            if (savings.length === 0) return 'Você não tem metas de economia cadastradas.';
            const totalTarget = savings.reduce((s, g) => s + g.targetAmount, 0);
            const totalCurrent = savings.reduce((s, g) => s + g.currentAmount, 0);
            const pct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;
            const goalList = savings
                .slice(0, 3)
                .map(g => {
                    const p = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
                    return `${g.description}: ${p}%`;
                }).join(', ');
            return `Você tem ${savings.length} meta${savings.length > 1 ? 's' : ''} de economia. Progresso geral: ${fmt(totalCurrent)} de ${fmt(totalTarget)}, ${pct}% concluído. Destaques: ${goalList}.`;
        }

        // ── Top expenses ──────────────────────────────────────────
        case 'top_expenses': {
            const expenses = txs.filter(t => t.date.startsWith(thisMonth) && t.type === 'EXPENSE');
            if (expenses.length === 0) return `Nenhuma despesa em ${monthName()} ainda.`;
            const sorted = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3);
            const list = sorted.map(t => `${t.description}: ${fmt(t.amount)}`).join(', ');
            return `Seus maiores gastos em ${monthName()}: ${list}.`;
        }

        // ── Top category ──────────────────────────────────────────
        case 'top_category': {
            const expenses = txs.filter(t => t.date.startsWith(thisMonth) && t.type === 'EXPENSE');
            if (expenses.length === 0) return `Nenhuma despesa em ${monthName()} ainda.`;
            const byCategory: Record<string, number> = {};
            expenses.forEach(t => {
                const cat = data.categories.find(c => c.id === t.categoryId);
                const name = cat?.name || 'Sem categoria';
                byCategory[name] = (byCategory[name] || 0) + t.amount;
            });
            const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
            const list = sorted.slice(0, 3).map(([name, total]) => `${name}: ${fmt(total)}`).join(', ');
            return `Categorias com mais gastos em ${monthName()}: ${list}.`;
        }

        // ── Transaction count ─────────────────────────────────────
        case 'transaction_count': {
            const monthTxs = txs.filter(t => t.date.startsWith(thisMonth));
            const incomeCount = monthTxs.filter(t => t.type === 'INCOME').length;
            const expenseCount = monthTxs.filter(t => t.type === 'EXPENSE').length;
            if (monthTxs.length === 0) return `Nenhum lançamento em ${monthName()} ainda.`;
            return `Em ${monthName()} você tem ${monthTxs.length} lançamento${monthTxs.length > 1 ? 's' : ''}: ${incomeCount} receita${incomeCount > 1 ? 's' : ''} e ${expenseCount} despesa${expenseCount > 1 ? 's' : ''}.`;
        }

        // ── Budget status ─────────────────────────────────────────
        case 'budget_status': {
            if (budgets.length === 0) return 'Você não tem orçamentos configurados. Acesse Cadastros para criar limites por categoria.';
            const results: string[] = [];
            for (const budget of budgets.slice(0, 3)) {
                const cat = data.categories.find(c => c.id === budget.categoryId);
                const name = cat?.name || 'Categoria';
                const spent = txs
                    .filter(t => t.date.startsWith(thisMonth) && t.categoryId === budget.categoryId && t.type === 'EXPENSE')
                    .reduce((s, t) => s + t.amount, 0);
                const pct = budget.limitAmount > 0 ? Math.round((spent / budget.limitAmount) * 100) : 0;
                const status = pct >= 100 ? 'ESTOURADO' : pct >= budget.alertPercent ? 'alerta' : 'OK';
                results.push(`${name}: ${fmt(spent)} de ${fmt(budget.limitAmount)} — ${pct}% (${status})`);
            }
            return `Status dos orçamentos em ${monthName()}: ${results.join('; ')}.`;
        }

        default:
            return 'Não consegui encontrar essa informação.';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Text-to-speech
// ─────────────────────────────────────────────────────────────────────────────
export function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 1.05;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ─────────────────────────────────────────────────────────────────────────────
// Commitment parser — extracts details from speech
// ─────────────────────────────────────────────────────────────────────────────
export interface ParsedCommitment {
    description: string;
    amount: number;
    dueDate: string; // yyyy-MM-dd
    categoryId?: string;
}

// Commitment trigger phrases that appear at the START and should be removed
const COMMITMENT_PREFIX_STRIPS = [
    'criar compromisso', 'novo compromisso', 'adicionar compromisso',
    'criar boleto', 'novo boleto', 'adicionar boleto',
    'criar conta a pagar', 'nova conta a pagar',
    'lembrar pagar', 'agendar pagamento', 'agendar compromisso',
    'compromisso de', 'vencimento de', 'tenho que pagar', 'devo pagar',
    'tenho um boleto de', 'tenho uma conta de',
    'registrar compromisso', 'marcar compromisso',
];

// Tokens that signal date / amount context and should be removed from description
const COMMITMENT_NOISE_TOKENS = new Set([
    'reais', 'real', 'conto', 'contos', 'pila', 'pilas', 'bala',
    'dia', 'hoje', 'ontem', 'amanha', 'amanhã', 'vence', 'vencendo',
    'de', 'do', 'da', 'dos', 'das', 'o', 'a', 'os', 'as',
    'um', 'uma', 'uns', 'umas', 'no', 'na', 'nos', 'nas',
    'pro', 'pra', 'por', 'para', 'ao', 'à',
    'ok', 'okay', 'pronto', 'finalizar', 'confirmar',
    'esse', 'este', 'essa', 'esta', 'mês', 'mes', 'semana',
    'janeiro', 'fevereiro', 'março', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]);

function normaliseStr(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Simple date-day resolver: picks current or next month depending on whether day is past
function resolveDayDate(day: number): string {
    const today = new Date();
    const candidate = new Date(today.getFullYear(), today.getMonth(), day);
    if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
    return format(candidate, 'yyyy-MM-dd');
}

export function parseCommitment(text: string, categories?: import('../models/types').Category[]): ParsedCommitment {
    const norm = normaliseStr(text);
    const today = new Date();

    // ── Amount ───────────────────────────────────────────────────────────────
    let amount = 0;
    // Match the largest plausible number in the phrase (avoid picking day numbers like "10")
    const allNums = [...norm.matchAll(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:reais?|contos?|pilas?|bala)?/g)];
    let best = 0;
    for (const m of allNums) {
        const val = parseFloat(m[1].replace(',', '.'));
        if (val > best && val < 1_000_000) { best = val; }
    }
    // Written numbers
    const written: [string, number][] = [
        ['dois mil', 2000], ['um mil', 1000], ['quinhentos', 500], ['quatrocentos', 400],
        ['trezentos', 300], ['duzentos', 200], ['cento e cinquenta', 150], ['cem', 100],
        ['noventa', 90], ['oitenta', 80], ['setenta', 70], ['sessenta', 60],
        ['cinquenta', 50], ['quarenta', 40], ['trinta', 30], ['vinte e cinco', 25],
        ['vinte', 20], ['quinze', 15], ['quatorze', 14], ['treze', 13], ['doze', 12],
        ['onze', 11], ['dez', 10], ['nove', 9], ['oito', 8], ['sete', 7],
        ['seis', 6], ['cinco', 5], ['quatro', 4], ['tres', 3],
    ];
    for (const [word, val] of written) {
        if (norm.includes(word) && val > best) { best = val; break; }
    }
    amount = best;

    // ── Due date ──────────────────────────────────────────────────────────────
    let dueDate = format(today, 'yyyy-MM-dd');

    if (norm.includes('amanha') || norm.includes('amanhã')) {
        dueDate = format(subDays(today, -1), 'yyyy-MM-dd');
    } else if (norm.includes('proxima semana') || norm.includes('próxima semana')) {
        const next = new Date(today); next.setDate(today.getDate() + 7);
        dueDate = format(next, 'yyyy-MM-dd');
    } else if (norm.includes('fim do mes') || norm.includes('fim do mês')) {
        dueDate = format(endOfMonth(today), 'yyyy-MM-dd');
    } else {
        const dayNumMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
        if (dayNumMatch) {
            const d = parseInt(dayNumMatch[1]);
            if (d >= 1 && d <= 31) dueDate = resolveDayDate(d);
        }
        // Month name mentions: "em fevereiro", "em março"
        const monthNames = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        for (let i = 0; i < monthNames.length; i++) {
            if (norm.includes(monthNames[i])) {
                const yr = i < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();
                const dayMatch2 = norm.match(/\bdia\s+(\d{1,2})\b/);
                const day2 = dayMatch2 ? parseInt(dayMatch2[1]) : today.getDate();
                dueDate = format(new Date(yr, i, day2), 'yyyy-MM-dd');
                break;
            }
        }
    }

    // ── Description ───────────────────────────────────────────────────────────
    // 1. Strip commitment trigger prefix (first match only)
    let workText = text.trim();
    for (const prefix of COMMITMENT_PREFIX_STRIPS) {
        const prefixNorm = normaliseStr(prefix);
        if (normaliseStr(workText).startsWith(prefixNorm)) {
            workText = workText.substring(prefix.length).trim();
            break;
        }
    }

    // 2. Tokenise, remove noise tokens and bare numbers
    const tokens = workText.split(/\s+/);
    let skipNext = false;
    const descTokens: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        const tokNorm = normaliseStr(tok.replace(/[.,!?;:]/g, ''));
        if (skipNext) { skipNext = false; continue; }
        if (COMMITMENT_NOISE_TOKENS.has(tokNorm)) {
            // If this is "dia", skip the next token too (it's the number)
            if (tokNorm === 'dia') skipNext = true;
            continue;
        }
        if (/^r\$/.test(tokNorm)) continue;   // skip "r$" or "r$50" currency tokens
        if (/^\$/.test(tokNorm)) continue;
        if (/^\d+([.,]\d{1,2})?$/.test(tokNorm)) continue;
        if (tok.length <= 1) continue;
        descTokens.push(tok);
    }

    let description = descTokens.join(' ').trim();
    if (!description || description.length < 2) {
        // Worst-case fallback: take non-numeric words from original
        description = text.trim().split(/\s+/).filter(w => !/^\d+$/.test(w)).slice(0, 4).join(' ');
    }
    description = description ? description.charAt(0).toUpperCase() + description.slice(1).toLowerCase() : 'Compromisso';

    // ── Category matching (same 3-strategy approach as aiParser) ─────────────
    let categoryId: string | undefined;
    if (categories && categories.length > 0) {
        const COMMITMENT_CAT_HINTS: { keywords: string[]; themes: string[] }[] = [
            { keywords: ['aluguel'], themes: ['moradia', 'habitação', 'habitacao', 'casa'] },
            { keywords: ['luz', 'energia'], themes: ['moradia', 'energia', 'utilidades', 'habitação'] },
            { keywords: ['agua', 'água'], themes: ['moradia', 'utilidades', 'habitação', 'agua'] },
            { keywords: ['internet', 'wifi'], themes: ['moradia', 'internet', 'telecom', 'habitação'] },
            { keywords: ['gas', 'gás'], themes: ['moradia', 'utilidades', 'habitação'] },
            { keywords: ['condominio', 'condomínio'], themes: ['moradia', 'condomínio', 'habitação'] },
            { keywords: ['cartao', 'cartão', 'fatura'], themes: ['dívida', 'divida', 'crédito', 'cartão'] },
            { keywords: ['escola', 'faculdade', 'mensalidade escolar'], themes: ['educação', 'educacao', 'escola'] },
            { keywords: ['academia', 'gym'], themes: ['saúde', 'saude', 'academia'] },
            { keywords: ['plano saude', 'plano de saúde'], themes: ['saúde', 'saude'] },
            { keywords: ['netflix', 'spotify', 'streaming'], themes: ['lazer', 'assinatura', 'entretenimento'] },
            { keywords: ['telefone', 'celular'], themes: ['telecom', 'comunicação', 'comunicacao', 'moradia'] },
            { keywords: ['seguro'], themes: ['seguro', 'financeiro', 'proteção'] },
            { keywords: ['emprestimo', 'empréstimo', 'financiamento'], themes: ['dívida', 'divida', 'financiamento'] },
        ];

        let bestScore = 0;
        let bestCat: import('../models/types').Category | undefined;

        for (const hint of COMMITMENT_CAT_HINTS) {
            if (hint.keywords.some(kw => norm.includes(normaliseStr(kw)))) {
                for (const cat of categories) {
                    const catNorm = normaliseStr(cat.name);
                    let score = 0;
                    for (const theme of hint.themes) {
                        const themeNorm = normaliseStr(theme);
                        if (catNorm === themeNorm) { score = 100; break; }
                        if (catNorm.includes(themeNorm) || themeNorm.includes(catNorm)) score = Math.max(score, 80);
                    }
                    if ((cat.type === 'EXPENSE' || cat.type === 'BOTH')) score += 5;
                    if (score > bestScore) { bestScore = score; bestCat = cat; }
                }
            }
        }

        // Direct name match
        if (bestScore < 50) {
            for (const cat of categories) {
                if (norm.includes(normaliseStr(cat.name)) && (cat.type === 'EXPENSE' || cat.type === 'BOTH')) {
                    if (80 > bestScore) { bestScore = 80; bestCat = cat; }
                }
            }
        }
        // Partial word overlap
        if (bestScore < 50) {
            for (const cat of categories) {
                const catWords = normaliseStr(cat.name).split(/\s+/).filter(w => w.length >= 4);
                for (const cw of catWords) {
                    if (norm.includes(cw) && (cat.type === 'EXPENSE' || cat.type === 'BOTH')) {
                        if (60 > bestScore) { bestScore = 60; bestCat = cat; }
                    }
                }
            }
        }
        if (bestCat) categoryId = bestCat.id;
    }

    return { description, amount, dueDate, categoryId };
}

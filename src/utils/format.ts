import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};

export const formatDate = (dateString: string, pattern: string = 'dd/MM/yyyy'): string => {
    try {
        // parseISO handles both YYYY-MM-DD and full ISO strings
        return format(parseISO(dateString), pattern, { locale: ptBR });
    } catch (error) {
        return dateString;
    }
};

export const formatMonthYear = (dateString: string): string => {
    try {
        return format(parseISO(dateString), 'MMMM yyyy', { locale: ptBR });
    } catch (error) {
        return dateString;
    }
};

/**
 * Sorting & filtering helpers for the Transactions page.
 */

/**
 * Compare two strings using pt-BR locale rules (case-insensitive, accent-aware).
 */
export const compareLocalePTBR = (a: string, b: string): number => {
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
};

/**
 * Parse an ISO date string to a numeric timestamp (ms).
 * Returns 0 for unparsable strings so sort still works.
 */
export const parseDateISO = (dateStr: string): number => {
    const ts = new Date(dateStr).getTime();
    return Number.isNaN(ts) ? 0 : ts;
};

/**
 * Normalise a string for accent-insensitive, case-insensitive search.
 * "São Paulo" → "sao paulo"
 */
export const normalizeSearch = (str: string): string => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

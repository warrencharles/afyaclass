/**
 * Natural sort helper for alphanumeric strings.
 * Handles numbers within strings correctly (e.g., "Exam 2" comes before "Exam 10").
 */
export const naturalSort = (a: string, b: string) => {
    // Robust fallback: manually extract first number sequence
    const numA = a.match(/\d+/);
    const numB = b.match(/\d+/);

    if (numA && numB) {
        const valA = parseInt(numA[0], 10);
        const valB = parseInt(numB[0], 10);
        if (valA !== valB) return valA - valB;
    }

    return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
    });
};

/**
 * Sorts an array of objects by a specific property using natural sort.
 * @param array The array to sort
 * @param key The key to sort by
 * @returns A new sorted array
 */
export const sortByProperty = <T>(array: T[], key: keyof T): T[] => {
    return [...array].sort((a, b) => {
        const valA = String(a[key] || '');
        const valB = String(b[key] || '');
        return naturalSort(valA, valB);
    });
};

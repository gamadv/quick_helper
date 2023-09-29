export function parseCSV(csvString: string): string[][] {
    const rows: string[] = csvString.split('\n');
    return rows.map(row => row.split(','));
}


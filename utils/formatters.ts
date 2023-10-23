export function formatCurrencyToBRL(value: string | number): string {
    const parseValue = new Intl.NumberFormat("pt-BR", {
        currency: "BRL",
        style: "currency",
    }).format(Number(value));

    return parseValue;
}

export function formatStringToCapitalize(phrase: string) {
    const parsedPhrase = phrase
        .trim()
        .toLowerCase()
        .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()));

    return parsedPhrase;
}

export function convertStringToCapitalize(phrase: string) {
  const parsedPhrase = phrase
    .trim()
    .toLowerCase()
    .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()));

  return parsedPhrase;
}

export function converteStringToArray(word: string) {
  const convertedWord = [...word];

  return convertedWord;
}

export function convertStringToCapitalize(phrase: string) {
  const parsedPhrase = phrase
    .trim()
    .toLowerCase()
    .replace(/\w\S*/g, (w) => w.replace(/^\w/, (c) => c.toUpperCase()))

  return parsedPhrase
}

export function converteStringToArray(word: string) {
  const convertedWord = [...word]

  return convertedWord
}

export function reverseOnlyLetters(S: string) {
  const isLetter = (letterSelected: string) =>
    letterSelected.toLowerCase() !== letterSelected.toUpperCase()
  const letters = [...S].filter((c) => isLetter(c))
  const reversed = [...S].map((c) => (isLetter(c) ? letters.pop() : c)).join('')
  return reversed
}

export const formatMoney = (money: string) => {
  return money.replace(
    new RegExp(`(?!^)(?=(\\d{3})+${money.includes('.') ? '\\.' : '$'})`, 'g'),
    ',',
  )
}


const arrayToTest = [
  { id: 1, name: "John" },
  { id: 2, name: "Kate" },
  { id: 3, name: "Peter" },
];

const mockArray = Array.from({ length: 10 }, () =>
  Math.floor(Math.random() * 10)
);

function removeObjectWithId(arr: any, id: any, returnObject?: boolean) {
  return arr.filter((arrItem: any) =>
    returnObject ? arrItem.id === id : arrItem.id !== id
  );
}

function removeDuplicates(arr: Array<any>) {
  const parseArray = [...new Set(arr)]

  return parseArray
}

function removeFalsyValues(arr: Array<any>) {
  return arr.filter(Boolean)
}

function sumFromInput(input: string): number {
  const values = input.split(',').map(Number);
  return values.reduce((total, value) => total + value, 0);
}

export { arrayToTest, removeObjectWithId, mockArray, removeDuplicates, removeFalsyValues, sumFromInput };

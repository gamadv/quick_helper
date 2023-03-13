const arrayToTest = [
  { id: 1, name: "John" },
  { id: 2, name: "Kate" },
  { id: 3, name: "Peter" },
];

function removeObjectWithId(arr: any, id: any, returnObject?: boolean) {
  return arr.filter((arrItem: any) =>
    returnObject ? arrItem.id === id : arrItem.id !== id
  );
}

export { arrayToTest, removeObjectWithId };

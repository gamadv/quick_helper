const products = [
  "preto-PP",
  "preto-M",
  "preto-G",
  "preto-GG",
  "preto-GG",
  "branco-PP",
  "branco-G",
  "vermelho-M",
  "azul-XG",
  "azul-XG",
  "azul-XG",
  "azul-P",
];

module.exports = () => {
  // Código aqui

  const productsRestructered = (products = []) => {
    return products.reduce((accumulator, currentValue) => {
      const product = currentValue.split("-");
      const [color, size] = product;

      if (!Object.keys(accumulator).includes(color)) {
        accumulator[color] = {};
      }

      accumulator[color][size] = !Object.keys(accumulator[color]).includes(size)
        ? 1
        : ++accumulator[color][size];

      return accumulator;
    }, {});
  };
  return productsRestructered(products);
};

import { ReactNode, useEffect, useState } from "react";

interface TestingProps {
  children?: ReactNode;
}

export function Testing({ children }: TestingProps) {
  const [noOfChocolates, setChocolates] = useState(1);
  const [chocoPrice, setChocoPrice] = useState(1);

  function addChoco() {
    console.log('cheguei no add')
    setChocoPrice((num2) => num2 + 1);
  }

  useEffect(() => {
    setChocolates(1);
    setChocoPrice(1);
  });

  return (
    <>
      <button onClick={addChoco}>Add Choco </button>
      <h1> {noOfChocolates}</h1>
      <h1> {chocoPrice}</h1>
      <div>
        <header></header>
        <p></p>
        <button></button>
      </div>
    </>
  );
}

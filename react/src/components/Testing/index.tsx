import { ReactNode, useEffect, useState } from "react";

interface TestingProps {
  children?: ReactNode;
}

export function Testing({ children }: TestingProps) {
  const [teste, setTeste] = useState(1);

  function addChoco() {
    console.log("cheguei no add");
    setTeste((num2) => num2 + 1);
  }

  useEffect(() => {});

  return (
    <>
      <button onClick={addChoco}>Add Button </button>
      <h1> {teste}</h1>
      <div>{children}</div>
    </>
  );
}

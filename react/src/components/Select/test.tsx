import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Select } from "./index";

export const optionsListMock = [
  "Selecione o Item",
  "Option 1",
  "Option 2",
  "Option 3",
];

describe("🧪Test Select", () => {
  test("🔘 Component Renders properly", () => {
    const Wrap = () => {
      function testOnChange(option: string | undefined) {}
      return (
        <Select optionsList={optionsListMock} onChange={() => testOnChange} />
      );
    };
    const { getByRole, debug } = render(<Wrap />);

    const buttonElement = getByRole("button");

    expect(buttonElement).toBeInTheDocument();

    fireEvent.click(buttonElement);

    const optionElement = getByRole("option", { name: "Option 1" });

    expect(optionElement).toBeInTheDocument();

    fireEvent.click(optionElement);

    debug();
    waitFor(() => {
      expect(optionElement.ariaSelected?.valueOf).toBeTruthy();
    });
  });
});

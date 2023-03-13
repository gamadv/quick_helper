import React from "react";
import { render } from "@testing-library/react";
import { Spinner } from ".";

describe("🔘 Spinner Component", () => {
  test("🧪 Spinner renders correctly", () => {
    const { getByTestId } = render(<Spinner />);

    expect(getByTestId("Spinner")).toBeInTheDocument();
  });
});

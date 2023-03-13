import React, { useState } from "react";
import { render, waitFor } from "@testing-library/react";
import { Radio } from "./radio";

describe("🔘 Radion Component", () => {
  test("🧪 Radion renders correctly", async () => {
    const Wrap = () => {
      const [checkedValue, setCheckedValue] = useState("");

      const handleChangeRadioValue = (
        event: React.ChangeEvent<HTMLInputElement>
      ) => {
        setCheckedValue(event.target.value);
      };

      return (
        <div>
          <p>Value Selected is: {checkedValue}</p>
          <Radio
            name="Testing_Radio_1"
            value="Testing Value 1"
            label="TestingRadio1"
            onChange={handleChangeRadioValue}
          />
          <Radio
            name="Testing_Radio_2"
            value="Testing Value 2"
            label="TestingRadio1"
            onChange={handleChangeRadioValue}
          />
        </div>
      );
    };

    const { findByRole } = render(<Wrap />);

    const element1 = findByRole("radio", { name: "Testing_Radio_1" });
    const element2 = findByRole("radio", { name: "Testing_Radio_2" });

    waitFor(() => {
      expect(element1).toBeInTheDocument();
      expect(element2).toBeInTheDocument();
    });
  });
});

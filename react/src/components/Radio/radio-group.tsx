import { Radio } from "./radio";

import { Fieldset, Legend, RadioGroupContainer } from "./styles";
import { RadioGroupProps } from "./type";

export const RadioButtonGroup = (props: RadioGroupProps) => {
  const { label, options, onChange, color, size } = props;

  function renderOptions() {
    return options.map((option, index) => {
      const { label, isDisabled, name = "undefined" } = option;
      const shortenedOptionLabel = label.replace(/\s+/g, "");
      const optionId = `radio-option-${shortenedOptionLabel}`;

      return (
        <Radio
          color={color}
          size={size}
          value={label}
          label={label}
          key={optionId}
          id={optionId}
          name={name}
          isDisabled={isDisabled}
          defaultChecked={index === 2}
          onChange={onChange}
        />
      );
    });
  }
  return (
    <Fieldset>
      <Legend>{label && label}</Legend>
      <RadioGroupContainer>{renderOptions()}</RadioGroupContainer>
    </Fieldset>
  );
};

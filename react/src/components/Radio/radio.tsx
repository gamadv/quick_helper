import { Container, Label, RadioInput } from "./styles";
import { RadioProps } from "./type";

export function Radio(props: RadioProps) {
  const {
    id,
    label,
    isDisabled,
    value,
    name,
    onChange,
    size,
    color = "#000",
    defaultChecked,
  } = props;
  return (
    <Container>
      <RadioInput
        id={id}
        role="radio"
        type="radio"
        disabled={isDisabled}
        name={name}
        value={value}
        onChange={onChange}
        color={color}
        size={size}
        defaultChecked={defaultChecked}
      />
      <Label htmlFor={id} isDisabled={isDisabled} color={color}>
        {label && <span>{label}</span>}
      </Label>
    </Container>
  );
}

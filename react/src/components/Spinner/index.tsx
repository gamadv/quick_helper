import { Container, SpinnerContent, SpinnerContentProps } from "./styles";

export const Spinner = (props: SpinnerContentProps) => {
  const { color, size, speed, thickness } = props;

  return (
    <Container>
      <SpinnerContent
        color={color}
        size={size}
        speed={speed}
        thickness={thickness}
        data-testid="Spinner"
      />
    </Container>
  );
};

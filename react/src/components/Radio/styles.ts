import styled, { css } from "styled-components";

type RadioInputProps = {
  size?: number;
  color?: string;
};

type RadioLabelProps = {
  size?: number;
  isDisabled?: boolean;
};

const mountRemValue = (number: number) => {
  return `${number}rem`;
};

export const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  gap: 0.5rem;
`;

export const Label = styled.label<RadioLabelProps>`
  ${({ isDisabled, color, theme }) => css`
    font-weight: 600;
    font-size: 1rem;
    color: ${isDisabled ? theme.defaultSemanticColors?.overlay2 : color};
    font-family: StabilGrotesk, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
    cursor: ${isDisabled && "not-allowed"};
  `}
`;

export const RadioInput = styled.input<RadioInputProps>`
  ${({ size = 1.5, color, theme }) => css`
    width: ${size}rem;
    height: ${size}rem;

    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-appearance: none;
    appearance: none;
    margin: 0;
    border: 2px solid ${color};
    border-radius: 50%;
    transition: all 0.1s ease-in-out;
    cursor: pointer;
    outline: none;

    ::after {
      content: "";
      display: block;
      border-radius: 50%;
      width: calc(${mountRemValue(size)} / 2);
      height: calc(${mountRemValue(size)} / 2);
    }

    :checked {
      ::after {
        background-color: ${color};
      }
      :hover {
        background-color: "#fff";
        border: 2px solid ${color};
        ::after {
          background-color: ${color};
        }
      }
    }
    :focus {
      outline: 2px solid ${theme.defaultSemanticColors?.warning};
    }
    :hover {
      ::after {
        background-color: ${theme.defaultSemanticColors?.overlay};
      }
    }
    :disabled {
      cursor: not-allowed;
      color: ${theme.defaultSemanticColors?.overlay2};
      border: 1px solid ${theme.defaultSemanticColors?.overlay2};
      background-color: ${theme.defaultSemanticColors?.overlay2};
      ::after {
        background-color: ${theme.defaultSemanticColors?.overlay2};
      }
      :hover {
        ::after {
          background-color: ${theme.defaultSemanticColors?.overlay2};
        }
      }
      :checked {
        background-color: ${theme.defaultSemanticColors?.overlay2};
        ::after {
          background-color: ${theme.defaultSemanticColors?.overlay2};
          color: ${theme.defaultSemanticColors?.overlay2};
        }
        :hover {
          background-color: ${theme.defaultSemanticColors?.overlay2};
          ::after {
            background-color: ${theme.defaultSemanticColors?.overlay2};
          }
        }
      }
    }
  `}
`;

// Radio Group
export const RadioGroupContainer = styled.div`
  padding: 0.5rem;
  display: grid;
  gap: 1rem;
`;
export const Fieldset = styled.fieldset`
  border: none;
`;

export const Legend = styled.legend<{ color?: string }>`
  ${({ theme, color }) => css`
    font-size: 1rem;
    font-weight: 600;
    color: ${color ?? theme.primary};
  `}
`;

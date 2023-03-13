import styled, { css } from "styled-components";

export type SelectContentProps = {
  borderColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  activeColor?: string;
};

type SelectListProps = SelectContentProps & {
  isOptionOpen: boolean;
};

export const Container = styled.div<{ width?: number }>`
  ${({ width }) => css`
    width: ${width}px;
  `}
`;
export const Content = styled.div<SelectContentProps>`
  ${({ borderColor, backgroundColor, borderRadius }) => css`
    position: relative;
    width: 100%;

    button {
      width: 100%;
      background: ${backgroundColor};
      border: 1px solid ${borderColor};
      border-radius: ${borderRadius}px;
      padding: 0.75rem;
    }
  `}
`;

export const SelectList = styled.ul<SelectListProps>`
  ${({ isOptionOpen, backgroundColor, borderColor, activeColor }) => css`
    background-color: ${backgroundColor};
    border: 1px solid ${borderColor};
    visibility: ${isOptionOpen ? "visible" : "hidden"};
    height: ${isOptionOpen ? "auto " : "0"};
    position: absolute;
    margin: 0;
    padding: 0;
    width: 100%;
    outline: none;
    list-style: none;

    li {
      cursor: pointer;
      padding: 0.75rem;

      &:hover,
      &:focus,
      &:active,
      &[aria-selected="true"] {
        border: 1px solid ${activeColor};
        background: ${activeColor};
        color: #fff;
      }
    }
  `}
`;

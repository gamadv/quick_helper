import styled, { css } from "styled-components";

export interface SpinnerContentProps {
  color?: string;
  size?: number;
  thickness?: number;
  speed?: number;
}

export const Container = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;

  width: auto;
  height: auto;
`;

export const SpinnerContent = styled.span<SpinnerContentProps>`
  ${({ color, size, thickness, speed }) => css`
    width: ${size ?? 20}px;
    height: ${size ?? 20}px;
    border: ${thickness ?? 2}px solid ${color ?? "#000"};
    border-top: ${thickness ?? 2}px solid transparent;
    border-radius: 50%;
    animation: spinner ${speed ?? 0.6}s linear infinite;

    @keyframes spinner {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
  `}
`;

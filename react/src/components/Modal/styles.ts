import styled, { css } from "styled-components";

export const Overlay = styled.div<{ bgColor?: string }>`
  ${({ bgColor }) => css`
    background: ${bgColor ?? "#1313137a"};
  `}
  position: fixed;
  left: 0px;
  top: 0px;
  width: 100vw;
  height: 100vh;
  z-index: 4;
`;

export const Container = styled.div`
  position: fixed;
  top: 40%;
  z-index: 5;
  width: 100%;
  height: auto;
  overflow-x: hidden;
  overflow-y: auto;
  outline: 0;
`;

export const Content = styled.section<{ size?: number; bgColor?: string }>`
  ${({ size, bgColor }) => css`
    max-width: ${size ?? 380}px;
    background: ${bgColor ?? "#fff"};
  `}
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  left: 0px;
  top: 40%;

  width: 100%;
  height: auto;

  margin: auto;
  padding: 1.5rem;

  z-index: 20;
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;

  background: none;
  border: none;
  outline: none;

  &:focus {
    outline: none;
  }
`;

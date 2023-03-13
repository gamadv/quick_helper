import styled from "styled-components";


export const InputWrapper = styled.div`
  padding: 16px;
  --focus-color: black;
  position: relative;
  display: flex;
  align-items: center;

  input {
  padding: 16px;
  border: 2px solid gray;
  outline: none;
  border-radius: 6px;
}
label {
  position: absolute;
  background-color: white;
  color: gray;
  left: 2rem;
  padding: 0 8px;
  border-radius: 8px;
  transition: all 0.2s ease-in;
}

input:is(:focus, :valid) {
  border: 2px solid #000;
}

input:is(:focus, :valid) + label {
  transform: translatey(calc(-1 * 18px - 12px));
  font-size: 14px;
  color: #000;
}
`;

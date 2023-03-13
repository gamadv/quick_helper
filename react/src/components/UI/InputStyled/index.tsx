import {InputWrapper} from './styles'

export default function InputStyled() {
  return (
    <InputWrapper>
      <input type="text" id="input" required></input>
      <label htmlFor="input">
        Username
      </label>
    </InputWrapper>
  );
}

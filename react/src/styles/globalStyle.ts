import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: Open-Sans, Helvetica, Sans-Serif;
  }
  *, *:before, *:after {
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
  }
  [disabled] {
    cursor: not-allowed;
  }
  button {
    cursor: pointer;
    background: none;
    border: none;
    outline: none;

    &:focus{
      outline: none;
    }
  }
  @media (max-width: 1080px) {
    html {
      font-size: 93, 75%;
    }
  }
  @media (max-width: 720px) {
    html {
      font-size: 87, 5%;
    }
  }

`;

export default GlobalStyle;

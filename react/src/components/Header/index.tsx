import ViteLogo from "/favicon.svg";
import "./styles.scss";
import { useGlobal } from "../../context/GlobalContext";

export default function Header() {
  const { contextWorking } = useGlobal();
  return (
    <header className="headerContainer">
      <img src={ViteLogo} alt="Logo" />

      <div className="wrapper">My template header - {contextWorking}</div>
    </header>
  );
}

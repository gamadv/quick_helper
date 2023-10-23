import React, {
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Container, Content, SelectContentProps, SelectList } from "./styles";
import { useClickAway } from "../../hooks/useClickAway";

export type SelectProps = SelectContentProps & {
  icon?: ReactNode;
  selectWidth?: number;
  optionsList: string[];
  onChange: (option?: string) => void;
};

export const Select = (props: SelectProps) => {
  const {
    optionsList,
    backgroundColor = "#fff",
    borderColor = "#000",
    borderRadius = 4,
    activeColor = "#000",
    icon,
    selectWidth = 200,
    onChange,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number>(0);
  const selectRef = useRef(null);

  const buttonLabel = optionsList[selectedOption];

  const handleKeyDown = (index: any) => (event: any) => {
    switch (event.key) {
      case " ":
      case "SpaceBar":
      case "Enter":
        event.preventDefault();
        getOption(index);
        break;
      default:
        break;
    }
  };

  function toggleOptions() {
    setIsOpen((oldState) => !oldState);
  }

  function getOption(index: number, value?: string) {
    if (index !== 0) {
      onChange(value);
      setSelectedOption(index);
      toggleOptions();
      return;
    }
    setSelectedOption(index);
    toggleOptions();
  }

  function handleListKeyDown(event?: any) {
    if (!optionsList?.length) return;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        setSelectedOption(
          selectedOption - 1 >= 0 ? selectedOption - 1 : optionsList.length - 1
        );
        break;
      case "ArrowDown":
        event.preventDefault();
        setSelectedOption(
          selectedOption === optionsList.length - 1 ? 0 : selectedOption + 1
        );
        break;
      default:
        break;
    }
  }
  const onEscKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") toggleOptions();
    },
    [isOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", onEscKeyDown, false);
    return () => {
      window.removeEventListener("keydown", onEscKeyDown, false);
    };
  }, [onEscKeyDown]);

  useClickAway(selectRef, () => setIsOpen(false));

  return (
    <Container width={selectWidth} ref={selectRef}>
      <Content
        borderColor={borderColor}
        backgroundColor={backgroundColor}
        borderRadius={borderRadius}
      >
        <button
          type="button"
          onClick={toggleOptions}
          onKeyDown={handleListKeyDown}
        >
          {buttonLabel}
          {icon && <span>Icone Aqui ⬆️</span>}
        </button>
        <SelectList
          role="listbox"
          tabIndex={-1}
          isOptionOpen={isOpen}
          backgroundColor={backgroundColor}
          aria-activedescendant={optionsList[selectedOption]}
          activeColor={activeColor}
          onKeyDown={() => handleListKeyDown}
        >
          {optionsList?.map((option: string, index: number) => (
            <li
              key={option + 1}
              role="option"
              aria-selected={selectedOption === index}
              tabIndex={index}
              onKeyDown={handleKeyDown(index)}
              onClick={() => {
                getOption(index, option);
              }}
              value={option}
            >
              {option}
            </li>
          ))}
        </SelectList>
      </Content>
    </Container>
  );
};

import { ChangeEvent } from "react";

export type IOption = {
  label: string;
  name?: string;

  isDisabled?: boolean;
};

export type RadioProps = {
  name: string;
  value: string;
  label: string;
  id?: string;
  isDisabled?: boolean;
  size?: number;
  color?: string;
  defaultChecked?: boolean | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

type ParsedRadioPropsForGroup = Omit<RadioProps, "name" | "value">;

export type RadioGroupProps = ParsedRadioPropsForGroup & {
  options: IOption[];
  label?: string;
  hasFullWidth?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

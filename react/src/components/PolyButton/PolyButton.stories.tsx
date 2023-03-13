import { Meta, StoryObj } from "@storybook/react";
import { PolyButton, TPolyButton } from "./index";

export default {
  title: "Components/PolyButton",
  component: PolyButton,
  args: {
    children: "Create button",
  },
  argTypes: {},
} as Meta<TPolyButton>;

export const Default: StoryObj<TPolyButton> = {};

export const CustomComponent: StoryObj<TPolyButton> = {
  args: {
    asChild: true,
    children: <p>New Element Test</p>,
  },
  argTypes: {
    children: {
      table: {
        disable: true,
      },
    },
  },
};

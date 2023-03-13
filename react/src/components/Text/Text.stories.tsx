import { Meta, StoryObj } from "@storybook/react";
import { Text, TTextprops } from "./index";

export default {
  title: "Components/Text",
  component: Text,
  args: {
    children: "Text Example",
    size: "sm",
  },
  argTypes: {
    size: {
      options: ["sm", "md", "lg"],
      control: {
        type: "inline-radio",
      },
    },
  },
} as Meta<TTextprops>;

export const Default: StoryObj<TTextprops> = {};

export const CustomComponent: StoryObj<TTextprops> = {
  args: {
    asChild: true,
    children: <p>New Element Test</p>,
  },
  argTypes: {
    size: {
      options: ["sm", "md", "lg"],
      control: {
        type: "inline-radio",
      },
    },
    children: {
      table: {
        disable: true,
      },
    },
  },
};

import { Meta, StoryObj } from "@storybook/react";
import { Spinner } from ".";
import { SpinnerContentProps } from "./styles";

export default {
  title: "Core/Spinner",
  component: Spinner,
  args: {
    color: "#000",
    speed: 0.4,
    thickness: 1,
    size: 30,
  },
  argTypes: {
    color: { control: { type: "color" } },
    size: { control: { type: "range" } },
    speed: { control: { type: "range", min: 0.1, step: 0.1 } },
    thickness: { control: { type: "range" } },
  },
} as Meta<SpinnerContentProps>;

export const Default: StoryObj = {};

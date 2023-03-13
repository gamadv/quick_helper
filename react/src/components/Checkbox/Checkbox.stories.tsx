import { Meta, StoryObj } from "@storybook/react";
import { Checkbox, TCheckbox } from "./index";
import { Text } from "../Text";

export default {
  title: "Components/Checkbox",
  component: Checkbox,
  args: {},
  argTypes: {},
  decorators: [
    (Story) => {
      return (
        <div className="flex items-center gap-2">
          {Story()}
          <Text>Test with Checkbox</Text>
        </div>
      )
    }
  ]
} as Meta<TCheckbox>;

export const Default: StoryObj<TCheckbox> = {};
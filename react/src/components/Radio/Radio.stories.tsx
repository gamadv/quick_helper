import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Radio } from "./radio";

export default {
  title: "Radio",
  component: Radio,
  argTypes: {
    isDisabled: { control: { type: "boolean" } },
    defaultChecked: { control: { type: "boolean" } },
    size: { control: { type: "number" } },
    onChange: {
      table: {
        disable: true,
      },
    },
  },
} as ComponentMeta<typeof Radio>;

const Template: ComponentStory<typeof Radio> = (args) => (
  <>
    <Radio {...args}>Componente Radio 1 </Radio>
    <Radio {...args}>Componente Radio 2 </Radio>
    <Radio {...args}>Componente Radio 3 </Radio>
  </>
);

export const Default = Template.bind({});
Default.args = {
  name: "storyBookRadio",
  label: "Radio Teste",
  isDisabled: false,
};
export const Disabled = Template.bind({});
Disabled.args = {
  label: "Disabled Radio",
  isDisabled: true,
  defaultChecked: true,
  color: "rgba(0,0,0,.1)",
};

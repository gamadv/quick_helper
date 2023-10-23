import { Meta } from "@storybook/react";

import { Modal, ModalProps } from ".";

export default {
  title: "Core/Modal",
  component: Modal,
  args: {
    isOpen: false,
    hasOverlay: true,
    hasCloseButton: true,
    onOverlayClose: true,
    overlayBgColor: "#e3e3e3",
    size: 980,
  },
  argTypes: {
    isOpen: { control: "boolean" },
    hasOverlay: { control: "boolean" },
    hasCloseButton: { control: "boolean" },
    onOverlayClose: { control: "boolean" },
    size: { control: { type: "range", min: 100, max: 1600, step: 5 } },
    overlayBgColor: { control: "color" },
    backgroundColor: { control: "color" },
    onClose: {
      control: {
        table: {
          disable: true,
        },
      },
    },
  },
} as Meta<ModalProps>;

export const Default = {};

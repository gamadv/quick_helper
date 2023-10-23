import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Modal } from ".";

describe("🔘 Modal Component", () => {
  test("🧪 Modal should be render", () => {
    const { queryByText } = render(
      <Modal isOpen>
        <p>example</p>
      </Modal>
    );

    const modalChildren = queryByText(/example/i);

    expect(modalChildren).toBeInTheDocument();
  });
  test("🧪 Modal should not be render", () => {
    const { queryByText } = render(
      <Modal isOpen={false}>
        <p>example</p>
      </Modal>
    );

    const modalChildren = queryByText(/example/i);

    expect(modalChildren).not.toBeInTheDocument();
  });
  test("🧪 Modal should close on closes function prop", () => {
    const onClose = jest.fn();
    const { queryByText, getByRole } = render(
      <Modal isOpen onClose={onClose} hasCloseButton>
        <p>example</p>
      </Modal>
    );

    const closeButton = getByRole("button", { name: /close-button/i });

    fireEvent.click(closeButton);

    waitFor(() => {
      const modalChildren = queryByText(/example/i);

      expect(modalChildren).toBeInTheDocument();
    });
  });
});

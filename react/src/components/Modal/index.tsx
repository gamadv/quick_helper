import { ReactNode, SVGProps, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";

import { Container, CloseButton, Content, Overlay } from "./styles";

export interface ModalProps {
  isOpen?: boolean;
  hasCloseButton?: boolean;
  onOverlayClose?: boolean;
  hasOverlay?: boolean;
  overlayBgColor?: string;
  backgroundColor?: string;
  size?: number;
  children?: ReactNode;
  onClose?: () => void;
}

const CloseIcon = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.5rem"
      height="1.5rem"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 256 256"
      {...props}
    >
      <path d="M205.7 194.3a8.1 8.1 0 0 1 0 11.4a8.2 8.2 0 0 1-11.4 0L128 139.3l-66.3 66.4a8.2 8.2 0 0 1-11.4 0a8.1 8.1 0 0 1 0-11.4l66.4-66.3l-66.4-66.3a8.1 8.1 0 0 1 11.4-11.4l66.3 66.4l66.3-66.4a8.1 8.1 0 0 1 11.4 11.4L139.3 128Z" />
    </svg>
  );
};

export const Modal = (props: ModalProps) => {
  const {
    isOpen,
    hasCloseButton,
    hasOverlay,
    onOverlayClose,
    overlayBgColor,
    backgroundColor,
    size,
    onClose,
    children,
  } = props;

  const closeModal = () => {
    if (onClose) {
      onClose();
    }
  };

  const onEscKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === "Escape") closeModal();
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", onEscKeyDown, false);
    return () => {
      window.removeEventListener("keydown", onEscKeyDown, false);
    };
  }, [onEscKeyDown]);

  return isOpen
    ? ReactDOM.createPortal(
        <>
          {hasOverlay && (
            <Overlay
              bgColor={overlayBgColor}
              onClick={onOverlayClose ? closeModal : undefined}
            />
          )}
          <Container>
            {isOpen && (
              <Content size={size} bgColor={backgroundColor}>
                {hasCloseButton && (
                  <CloseButton onClick={closeModal} aria-label="close-button">
                    <CloseIcon />
                  </CloseButton>
                )}
                {children}
              </Content>
            )}
          </Container>
        </>,
        document.body
      )
    : null;
};

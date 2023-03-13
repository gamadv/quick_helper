import { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";

export type TPolyButton = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
};

export function PolyButton({asChild, ...props}: TPolyButton) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={clsx("px-4 py-2 rounded bg-yellow-700 text-white", {})}
      {...props}
    />
  );
}

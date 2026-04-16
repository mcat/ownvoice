import { useRef } from "preact/hooks";
import type { JSX } from "preact";

type BtnProps = {
  onClick?: () => void;
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children: preact.ComponentChildren;
} & Omit<JSX.HTMLAttributes<HTMLButtonElement>, "onClick" | "class" | "style" | "disabled">;

/** Base debounced button — 300ms lockout for tremor protection */
export function Btn({
  children,
  onClick,
  disabled,
  class: className,
  style,
  ...props
}: BtnProps) {
  const lock = useRef(false);

  const handle = () => {
    if (lock.current || disabled) return;
    lock.current = true;
    onClick?.();
    setTimeout(() => {
      lock.current = false;
    }, 300);
  };

  return (
    <button
      onClick={handle}
      disabled={disabled}
      class={`font-sans cursor-pointer select-none ${disabled ? "!cursor-default" : ""} ${className ?? ""}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}

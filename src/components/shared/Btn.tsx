import { useRef } from "preact/hooks";
import type { JSX } from "preact";
import { useSettingsStore } from "../../stores/settingsStore";

type BtnProps = {
  onClick?: () => void;
  disabled?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  children: preact.ComponentChildren;
} & Omit<JSX.HTMLAttributes<HTMLButtonElement>, "onClick" | "class" | "style" | "disabled">;

/** Base debounced button — 300ms tremor-protection lockout, or 500ms when
 *  Assistive Input Mode is on (longer cursor-overshoot tolerance for
 *  patients using trackballs, joysticks, AssistiveTouch, or switches). */
export function Btn({
  children,
  onClick,
  disabled,
  class: className,
  style,
  ...props
}: BtnProps) {
  const lock = useRef(false);
  const assistiveInput = useSettingsStore((s) => s.cfg?.assistiveInput === true);
  const lockoutMs = assistiveInput ? 500 : 300;

  const handle = () => {
    if (lock.current || disabled) return;
    lock.current = true;
    onClick?.();
    setTimeout(() => {
      lock.current = false;
    }, lockoutMs);
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

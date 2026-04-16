import { useRef, useCallback } from "preact/hooks";

/**
 * 300ms debounce for tremor protection.
 * Prevents double-fires from imprecise patient taps.
 */
export function useDebouncedTap(onTap: () => void) {
  const locked = useRef(false);

  const handleTap = useCallback(() => {
    if (locked.current) return;
    locked.current = true;
    onTap();
    setTimeout(() => {
      locked.current = false;
    }, 300);
  }, [onTap]);

  return handleTap;
}

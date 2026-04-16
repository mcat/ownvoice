import { Btn } from "../shared/Btn";
import { useTheme } from "../../hooks/useTheme";
import type { ThemeTokens } from "../../theme/tokens";

interface SubcategoryChipsProps {
  labels: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  t: ThemeTokens;
}

export function SubcategoryChips({
  labels,
  activeIndex,
  onSelect,
  t,
}: SubcategoryChipsProps) {
  const { theme } = useTheme();
  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
      {labels.map((label, i) => {
        const active = i === activeIndex;
        return (
          <Btn
            key={label}
            onClick={() => onSelect(i)}
            style={{
              background: active ? t.card : "transparent",
              color: active ? t.text : t.sub,
              border: active
                ? `1px solid ${t.border}`
                : "1px solid transparent",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: active ? 700 : 500,
              whiteSpace: "nowrap",
              boxShadow: active
                ? (theme === "dark" ? "none" : "0 1px 3px rgba(0,0,0,0.06)")
                : "none",
            }}
          >
            {label}
          </Btn>
        );
      })}
    </div>
  );
}

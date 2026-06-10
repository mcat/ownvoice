import { light, dark, themes, colors, painColors, painBorderColors } from "./tokens";

describe("light and dark theme tokens", () => {
  it("have identical keys", () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(dark).sort());
  });

  it("all light token values are non-empty strings", () => {
    for (const [, value] of Object.entries(light)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("all dark token values are non-empty strings", () => {
    for (const [, value] of Object.entries(dark)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

// WCAG relative luminance + contrast ratio (sRGB).
function channelLin(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = channelLin(parseInt(c.slice(0, 2), 16) / 255);
  const g = channelLin(parseInt(c.slice(2, 4), 16) / 255);
  const b = channelLin(parseInt(c.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function hueDeg(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d === 0) return 0;
  let h: number;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

describe("pain tile border ramp (WCAG 1.4.11 non-text contrast)", () => {
  // The 3px tile border is the only boundary between a pain tile and the
  // card background — at both scale extremes the shared fill ramp fails
  // the 3:1 non-text floor (light end vs white, dark end vs dark card).
  // painBorderColors is the per-theme border ramp; the fill ramp
  // (painColors) is unchanged.

  it("provides 11 border colors per theme, aligned with painColors indices", () => {
    expect(painBorderColors.light).toHaveLength(11);
    expect(painBorderColors.dark).toHaveLength(11);
  });

  it("every light border meets 3:1 against the light card", () => {
    for (const c of painBorderColors.light) {
      expect(contrast(c, light.card), `${c} vs ${light.card}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("every dark border meets 3:1 against the dark card", () => {
    for (const c of painBorderColors.dark) {
      expect(contrast(c, dark.card), `${c} vs ${dark.card}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("both ramps darken monotonically (higher pain = deeper indigo)", () => {
    for (const ramp of [painBorderColors.light, painBorderColors.dark]) {
      for (let i = 1; i < ramp.length; i++) {
        expect(luminance(ramp[i]), `${ramp[i]} vs ${ramp[i - 1]}`).toBeLessThan(
          luminance(ramp[i - 1]),
        );
      }
    }
  });

  it("stays a single-hue indigo family (colorblind-safe, no red-green)", () => {
    for (const c of [...painBorderColors.light, ...painBorderColors.dark]) {
      const h = hueDeg(c);
      expect(h, `${c} hue ${h}`).toBeGreaterThanOrEqual(220);
      expect(h, `${c} hue ${h}`).toBeLessThanOrEqual(260);
    }
  });
});

describe("themes", () => {
  it("has light and dark entries", () => {
    expect(themes.light).toBe(light);
    expect(themes.dark).toBe(dark);
  });

  it("has exactly two entries", () => {
    expect(Object.keys(themes)).toEqual(["light", "dark"]);
  });
});

describe("colors", () => {
  it("has expected semantic color keys", () => {
    expect(colors).toHaveProperty("patient");
    expect(colors).toHaveProperty("provider");
    expect(colors).toHaveProperty("urgent");
    expect(colors).toHaveProperty("purple");
    expect(colors).toHaveProperty("amber");
  });

  it("urgent is a plain string", () => {
    expect(typeof colors.urgent).toBe("string");
    expect(colors.urgent.length).toBeGreaterThan(0);
  });

  it("themed colors have light and dark variants", () => {
    for (const key of ["patient", "patientDeep", "provider", "providerDeep", "purple", "amber"] as const) {
      const c = colors[key];
      expect(typeof c.light).toBe("string");
      expect(typeof c.dark).toBe("string");
      expect(c.light.length).toBeGreaterThan(0);
      expect(c.dark.length).toBeGreaterThan(0);
    }
  });
});

describe("painColors", () => {
  it("is an array of 11 colors for the 0-10 pain scale", () => {
    expect(Array.isArray(painColors)).toBe(true);
    expect(painColors).toHaveLength(11);
  });

  it("all entries are non-empty color strings", () => {
    for (const color of painColors) {
      expect(typeof color).toBe("string");
      expect(color.length).toBeGreaterThan(0);
      // Each should be a hex color
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

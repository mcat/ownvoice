import { light, dark, themes, colors, painColors } from "./tokens";

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

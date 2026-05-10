import { useUIStore } from "./uiStore";

// Reset store to initial state before each test
beforeEach(() => {
  useUIStore.getState().resetUI();
});

describe("useUIStore", () => {
  describe("initial state", () => {
    it('has tab="quick"', () => {
      expect(useUIStore.getState().tab).toBe("quick");
    });

    it("has sub=0", () => {
      expect(useUIStore.getState().sub).toBe(0);
    });

    it("has builderOpen=false", () => {
      expect(useUIStore.getState().builderOpen).toBe(false);
    });

    it("has all overlays closed", () => {
      const s = useUIStore.getState();
      expect(s.wishesOpen).toBe(false);
      expect(s.providerOpen).toBe(false);
      expect(s.settingsOpen).toBe(false);
      expect(s.pinEntryOpen).toBe(false);
      expect(s.switchSheetOpen).toBe(false);
      expect(s.addPatientOpen).toBe(false);
    });

    it("has speaking=null", () => {
      expect(useUIStore.getState().speaking).toBeNull();
    });

    it("has activeProvIdx=0", () => {
      expect(useUIStore.getState().activeProvIdx).toBe(0);
    });
  });

  describe("setTab", () => {
    it("changes the tab", () => {
      useUIStore.getState().setTab("needs");
      expect(useUIStore.getState().tab).toBe("needs");
    });

    it("resets sub to 0", () => {
      useUIStore.getState().setSub(3);
      useUIStore.getState().setTab("feelings");
      expect(useUIStore.getState().sub).toBe(0);
    });

    it("closes the builder", () => {
      useUIStore.getState().toggleBuilder(); // open
      expect(useUIStore.getState().builderOpen).toBe(true);
      useUIStore.getState().setTab("pain");
      expect(useUIStore.getState().builderOpen).toBe(false);
    });
  });

  describe("setSub", () => {
    it("sets the sub index", () => {
      useUIStore.getState().setSub(2);
      expect(useUIStore.getState().sub).toBe(2);
    });
  });

  describe("toggleBuilder", () => {
    it("toggles builderOpen from false to true", () => {
      expect(useUIStore.getState().builderOpen).toBe(false);
      useUIStore.getState().toggleBuilder();
      expect(useUIStore.getState().builderOpen).toBe(true);
    });

    it("toggles builderOpen from true to false", () => {
      useUIStore.getState().toggleBuilder(); // true
      useUIStore.getState().toggleBuilder(); // false
      expect(useUIStore.getState().builderOpen).toBe(false);
    });
  });

  describe("openOverlay / closeOverlay", () => {
    const overlays = [
      ["wishes", "wishesOpen"],
      ["provider", "providerOpen"],
      ["settings", "settingsOpen"],
      ["pinEntry", "pinEntryOpen"],
      ["switch", "switchSheetOpen"],
      ["addPatient", "addPatientOpen"],
    ] as const;

    for (const [name, key] of overlays) {
      it(`openOverlay("${name}") sets ${key} to true`, () => {
        useUIStore.getState().openOverlay(name);
        expect(useUIStore.getState()[key]).toBe(true);
      });

      it(`closeOverlay("${name}") sets ${key} to false`, () => {
        useUIStore.getState().openOverlay(name);
        useUIStore.getState().closeOverlay(name);
        expect(useUIStore.getState()[key]).toBe(false);
      });
    }
  });

  describe("closeAllOverlays", () => {
    it("closes every overlay", () => {
      const { openOverlay, closeAllOverlays } = useUIStore.getState();
      openOverlay("wishes");
      openOverlay("provider");
      openOverlay("settings");
      openOverlay("pinEntry");
      openOverlay("switch");
      openOverlay("addPatient");

      closeAllOverlays();

      const s = useUIStore.getState();
      expect(s.wishesOpen).toBe(false);
      expect(s.providerOpen).toBe(false);
      expect(s.settingsOpen).toBe(false);
      expect(s.pinEntryOpen).toBe(false);
      expect(s.switchSheetOpen).toBe(false);
      expect(s.addPatientOpen).toBe(false);
    });
  });

  describe("setActiveProvIdx", () => {
    it("sets the provider index", () => {
      useUIStore.getState().setActiveProvIdx(5);
      expect(useUIStore.getState().activeProvIdx).toBe(5);
    });
  });

  describe("setSpeaking", () => {
    it("sets a speaking state", () => {
      const speaking = { text: "Hello", from: "patient" as const };
      useUIStore.getState().setSpeaking(speaking);
      expect(useUIStore.getState().speaking).toEqual(speaking);
    });

    it("clears speaking when passed null", () => {
      useUIStore.getState().setSpeaking({ text: "Hi", from: "provider" });
      useUIStore.getState().setSpeaking(null);
      expect(useUIStore.getState().speaking).toBeNull();
    });
  });

  describe("staffAuthed state", () => {
    it("staffAuthed starts false", () => {
      expect(useUIStore.getState().staffAuthed).toBe(false);
    });

    it("staffAuthedAt starts null", () => {
      expect(useUIStore.getState().staffAuthedAt).toBeNull();
    });

    it("setStaffAuthed(true) + bumpStaffAuthed updates timestamp", () => {
      useUIStore.getState().setStaffAuthed(true);
      expect(useUIStore.getState().staffAuthed).toBe(true);
      expect(useUIStore.getState().staffAuthedAt).toBeNull(); // not set by setStaffAuthed

      useUIStore.getState().bumpStaffAuthed();
      expect(useUIStore.getState().staffAuthedAt).toBeTypeOf("number");
      expect(useUIStore.getState().staffAuthedAt).toBeGreaterThan(0);
    });

    it("bumpStaffAuthed is a no-op when staffAuthed is false", () => {
      expect(useUIStore.getState().staffAuthed).toBe(false);
      expect(useUIStore.getState().staffAuthedAt).toBeNull();

      useUIStore.getState().bumpStaffAuthed();

      expect(useUIStore.getState().staffAuthed).toBe(false);
      expect(useUIStore.getState().staffAuthedAt).toBeNull();
    });

    it("endStaffSession sets both to false/null", () => {
      useUIStore.getState().setStaffAuthed(true);
      useUIStore.getState().bumpStaffAuthed();
      expect(useUIStore.getState().staffAuthed).toBe(true);
      expect(useUIStore.getState().staffAuthedAt).not.toBeNull();

      useUIStore.getState().endStaffSession();

      expect(useUIStore.getState().staffAuthed).toBe(false);
      expect(useUIStore.getState().staffAuthedAt).toBeNull();
    });
  });

  describe("resetUI", () => {
    it("restores all defaults", () => {
      // Mutate everything
      const s = useUIStore.getState();
      s.setTab("pain");
      s.setSub(4);
      s.toggleBuilder();
      s.openOverlay("wishes");
      s.openOverlay("provider");
      s.setActiveProvIdx(7);
      s.setSpeaking({ text: "x", from: "patient" });

      // Reset
      useUIStore.getState().resetUI();

      const after = useUIStore.getState();
      expect(after.tab).toBe("quick");
      expect(after.sub).toBe(0);
      expect(after.builderOpen).toBe(false);
      expect(after.wishesOpen).toBe(false);
      expect(after.providerOpen).toBe(false);
      expect(after.settingsOpen).toBe(false);
      expect(after.pinEntryOpen).toBe(false);
      expect(after.switchSheetOpen).toBe(false);
      expect(after.addPatientOpen).toBe(false);
      expect(after.activeProvIdx).toBe(0);
      expect(after.speaking).toBeNull();
    });

    it("clears staffAuthed and staffAuthedAt", () => {
      useUIStore.getState().setStaffAuthed(true);
      useUIStore.getState().bumpStaffAuthed();

      useUIStore.getState().resetUI();

      expect(useUIStore.getState().staffAuthed).toBe(false);
      expect(useUIStore.getState().staffAuthedAt).toBeNull();
    });
  });
});

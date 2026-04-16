import { clearAll } from "./store";
import { createIDBStorage } from "./stores/idbStorage";

describe("clearAll", () => {
  it("removes all keys from the IDB store", async () => {
    const storage = createIDBStorage();

    // Write some data
    await storage.setItem("key-a", "value-a");
    await storage.setItem("key-b", "value-b");
    await storage.setItem("key-c", "value-c");

    // Verify data is present
    expect(await storage.getItem("key-a")).toBe("value-a");
    expect(await storage.getItem("key-b")).toBe("value-b");

    // Clear everything
    await clearAll();

    // All keys should be gone
    expect(await storage.getItem("key-a")).toBeNull();
    expect(await storage.getItem("key-b")).toBeNull();
    expect(await storage.getItem("key-c")).toBeNull();
  });

  it("does not throw on an empty store", async () => {
    // Should be safe to call even when already empty
    await expect(clearAll()).resolves.toBeUndefined();
  });
});

describe("openDB onupgradeneeded", () => {
  it("creates the 'kv' object store on first open (via clearAll)", async () => {
    // clearAll() calls openDB() internally which triggers onupgradeneeded
    // if the "kv" store doesn't exist yet. This is already exercised by
    // the "removes all keys" test above, but we verify the store explicitly.
    await clearAll();

    // Verify the DB was created with the 'kv' store by opening it directly
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("ownvoice", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    expect(db.objectStoreNames.contains("kv")).toBe(true);
    db.close();
  });
});

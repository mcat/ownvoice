export async function clearAuditForPatient(db: IDBDatabase, patientIdHash: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let deleted = 0;
    const tx = db.transaction(["events", "workflows"], "readwrite");
    const events = tx.objectStore("events");
    const workflows = tx.objectStore("workflows");

    const eIdx = events.index("by_patient_time");
    const wIdx = workflows.index("by_patient_id_hash");

    const eReq = eIdx.openCursor(IDBKeyRange.bound(
      [patientIdHash, -Infinity], [patientIdHash, Infinity],
    ));
    eReq.onsuccess = () => {
      const c = eReq.result;
      if (c) { c.delete(); deleted += 1; c.continue(); }
    };
    eReq.onerror = () => reject(eReq.error);

    const wReq = wIdx.openCursor(IDBKeyRange.only(patientIdHash));
    wReq.onsuccess = () => {
      const c = wReq.result;
      if (c) { c.delete(); deleted += 1; c.continue(); }
    };
    wReq.onerror = () => reject(wReq.error);

    tx.oncomplete = () => resolve(deleted);
    tx.onerror = () => reject(tx.error);
  });
}

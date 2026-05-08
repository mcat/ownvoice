import { useEffect, useRef, useState } from "preact/hooks";
import { Virtualizer, observeElementOffset, observeElementRect, elementScroll } from "@tanstack/virtual-core";
import type { AuditRecord } from "../../audit/types";

export interface EventTableColumn {
  id: string;
  header: string;
  render: (r: AuditRecord) => string;
  width?: string;
}

export interface EventTableProps {
  records: readonly AuditRecord[];
  columns: EventTableColumn[];
  rowHeight?: number;
}

const DEFAULT_ROW_HEIGHT = 28;

export function EventTable({ records, columns, rowHeight = DEFAULT_ROW_HEIGHT }: EventTableProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState(0);
  // Element item-type matches @tanstack/virtual-core's default; we don't
  // pass a measureElement override so leaving it as Element keeps the
  // Virtualizer constructor's inferred type compatible with the assignment.
  const virtRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);

  // Mount the virtualizer ONCE per scroller. Recreating on every
  // records.length change tore down the ResizeObserver and cascaded
  // through onChange→setTick re-renders; with the live subscribe in
  // ActivityLog firing on every audit event, that loop locked the
  // main thread.
  useEffect(() => {
    if (!scrollerRef.current) return;
    const v = new Virtualizer({
      count: records.length,
      getScrollElement: () => scrollerRef.current,
      estimateSize: () => rowHeight,
      observeElementRect,
      observeElementOffset,
      scrollToFn: elementScroll,
      onChange: () => setTick((t) => t + 1),
    });
    virtRef.current = v;
    const cleanup = v._didMount();
    v._willUpdate();
    return () => { cleanup(); virtRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply count/rowHeight changes via setOptions instead of remount.
  useEffect(() => {
    const v = virtRef.current;
    if (!v) return;
    v.setOptions({
      ...v.options,
      count: records.length,
      estimateSize: () => rowHeight,
    });
    v._willUpdate();
    setTick((t) => t + 1);
  }, [records.length, rowHeight]);

  const v = virtRef.current;
  const items = v?.getVirtualItems() ?? [];
  const totalSize = v?.getTotalSize() ?? 0;

  if (records.length === 0) {
    return <div style={{ padding: 24, color: "#666" }}>No events match current filters.</div>;
  }

  // When the virtualizer hasn't measured yet (first render, or jsdom where
  // ResizeObserver reports a 0-height scroller), fall back to rendering the
  // first record so the table is non-empty for assistive tech / tests. The
  // virtualizer takes over once measurements arrive in real browsers.
  const renderItems = items.length > 0
    ? items.map((item) => ({ index: item.index, key: item.key as number | string, start: item.start }))
    : [{ index: 0, key: 0, start: 0 }];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", borderBottom: "2px solid #888", fontWeight: "bold", padding: "4px 8px" }}>
        {columns.map((c) => (
          <div key={c.id} style={{ flex: c.width ?? "1 1 0" }}>{c.header}</div>
        ))}
      </div>
      <div ref={scrollerRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div style={{ height: totalSize || records.length * rowHeight, position: "relative" }}>
          {renderItems.map((item) => {
            const rec = records[item.index];
            return (
              <div
                key={item.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: rowHeight,
                  transform: `translateY(${item.start}px)`,
                  display: "flex",
                  padding: "4px 8px",
                  borderBottom: "1px solid #eee",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                {columns.map((c) => (
                  <div key={c.id} style={{ flex: c.width ?? "1 1 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.render(rec)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

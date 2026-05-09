import { useEffect, useRef, useState } from "preact/hooks";
import { Virtualizer, observeElementOffset, observeElementRect, elementScroll } from "@tanstack/virtual-core";
import type { WorkflowState, StepRecord } from "../../audit/types";
import { getWorkflowDetail } from "../../audit/queryWorkflows";
import { formatLogTimestamp } from "./formatTime";

export interface WorkflowTableProps {
  workflows: readonly WorkflowState[];
}

const STATUS_COLOR: Record<WorkflowState["status"], string> = {
  running: "var(--color-ov-patient)",
  completed: "var(--color-ov-provider)",
  failed: "var(--color-ov-urgent)",
  abandoned: "var(--color-ov-amber)",
};

function fmtDuration(start: number, end?: number): string {
  if (!end) return "running";
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

const RESULT_PREVIEW_CHARS = 200;
function previewResult(result?: string): string {
  if (!result) return "";
  if (result.length <= RESULT_PREVIEW_CHARS) return result;
  return result.slice(0, RESULT_PREVIEW_CHARS) + `… (+${result.length - RESULT_PREVIEW_CHARS} chars)`;
}

const COLLAPSED_ROW_HEIGHT = 32;
// Per-step block in the expanded panel; conservative — long results wrap and
// virtualization treats this as an estimate, not a hard cap.
const EXPANDED_ROW_BASE = 60;
const STEP_ROW_HEIGHT = 56;

function estimateRowHeight(w: WorkflowState, expanded: boolean): number {
  if (!expanded) return COLLAPSED_ROW_HEIGHT;
  if (w.step_history.length === 0) return COLLAPSED_ROW_HEIGHT + 36;
  return COLLAPSED_ROW_HEIGHT + EXPANDED_ROW_BASE + w.step_history.length * STEP_ROW_HEIGHT;
}

export function WorkflowTable({ workflows }: WorkflowTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Per-workflow full detail loaded on expand. The summary list keeps
  // step.result truncated; the full payload only resides in memory for
  // workflows the viewer has currently expanded.
  const [details, setDetails] = useState<Record<string, WorkflowState>>({});
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState(0);
  const virtRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(null);

  // Mount the virtualizer once.
  useEffect(() => {
    if (!scrollerRef.current) return;
    const v = new Virtualizer({
      count: workflows.length,
      getScrollElement: () => scrollerRef.current,
      estimateSize: (i) => estimateRowHeight(workflows[i], expanded.has(workflows[i].workflow_id)),
      observeElementRect,
      observeElementOffset,
      scrollToFn: elementScroll,
      onChange: () => setTick((t) => t + 1),
      overscan: 6,
    });
    virtRef.current = v;
    const cleanup = v._didMount();
    v._willUpdate();
    return () => { cleanup(); virtRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync count + size estimates when the workflow list or expand-state changes.
  useEffect(() => {
    const v = virtRef.current;
    if (!v) return;
    v.setOptions({
      ...v.options,
      count: workflows.length,
      estimateSize: (i) => estimateRowHeight(workflows[i], expanded.has(workflows[i].workflow_id)),
    });
    // Force re-measurement when expansion toggles, since cached sizes
    // for the same index now differ.
    v.measure();
    v._willUpdate();
    setTick((t) => t + 1);
  }, [workflows, expanded]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Drop the cached full detail so memory tracks current expansion.
        setDetails((d) => {
          if (!(id in d)) return d;
          const { [id]: _drop, ...rest } = d;
          return rest;
        });
      } else {
        next.add(id);
        // Lazy-load the full step.result payloads for this workflow.
        void getWorkflowDetail(id).then((full) => {
          if (full) setDetails((d) => ({ ...d, [id]: full }));
        });
      }
      return next;
    });
  }

  if (workflows.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--color-ov-muted)",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
        }}
      >
        No workflows match current filters.
      </div>
    );
  }

  const v = virtRef.current;
  const items = v?.getVirtualItems() ?? [];
  const totalSize = v?.getTotalSize() ?? workflows.length * COLLAPSED_ROW_HEIGHT;
  // Mirror EventTable's empty-virtualizer fallback: render the first row
  // before measurements arrive (jsdom / first paint).
  const renderItems = items.length > 0
    ? items.map((item) => ({ index: item.index, key: item.key as number | string, start: item.start }))
    : [{ index: 0, key: 0, start: 0 }];

  return (
    <div data-testid="workflow-table" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-ov-border)",
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--color-ov-sub)",
          padding: "8px 10px",
          background: "var(--color-ov-card)",
        }}
      >
        <div style={{ flex: "0 0 24px" }} />
        <div style={{ flex: "0 0 220px" }}>Started</div>
        <div style={{ flex: "0 0 100px" }}>Status</div>
        <div style={{ flex: "0 0 180px" }}>Workflow</div>
        <div style={{ flex: "0 0 80px" }}>Duration</div>
        <div style={{ flex: "0 0 60px" }}>Steps</div>
        <div style={{ flex: "0 0 60px" }}>Attempt</div>
        <div style={{ flex: 1 }}>Last step / error</div>
      </div>
      <div ref={scrollerRef} style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <div style={{ height: totalSize, position: "relative" }}>
          {renderItems.map((item) => {
            const w = workflows[item.index];
            if (!w) return null;
            const isOpen = expanded.has(w.workflow_id);
            const lastStep = w.step_history.length > 0 ? w.step_history[w.step_history.length - 1] : undefined;
            const lastStepLabel = w.status === "failed" && lastStep?.error
              ? `${lastStep.step_name}: ${lastStep.error.type} — ${lastStep.error.message}`
              : lastStep?.step_name ?? "—";
            return (
              <div
                key={item.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${item.start}px)`,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--color-ov-text)",
                  borderBottom: "1px solid var(--color-ov-border)",
                }}
              >
                <button
                  onClick={() => toggle(w.workflow_id)}
                  aria-expanded={isOpen}
                  aria-label={`Toggle ${w.name} details`}
                  style={{
                    display: "flex", width: "100%", padding: "6px 10px",
                    background: "transparent", border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: "inherit", color: "inherit",
                    textAlign: "left",
                    height: COLLAPSED_ROW_HEIGHT,
                    boxSizing: "border-box",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: "0 0 24px" }}>{isOpen ? "▼" : "▶"}</div>
                  <div style={{ flex: "0 0 220px" }}>{formatLogTimestamp(w.started_at)}</div>
                  <div style={{ flex: "0 0 100px", color: STATUS_COLOR[w.status], fontWeight: 600 }}>{w.status}</div>
                  <div style={{ flex: "0 0 180px" }}>{w.name}</div>
                  <div style={{ flex: "0 0 80px" }}>{fmtDuration(w.started_at, w.ended_at)}</div>
                  <div style={{ flex: "0 0 60px" }}>{w.step_history.length}</div>
                  <div style={{ flex: "0 0 60px" }}>{w.attempt}</div>
                  <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lastStepLabel}</div>
                </button>
                {isOpen && <StepHistory steps={(details[w.workflow_id] ?? w).step_history} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepHistory({ steps }: { steps: StepRecord[] }) {
  if (steps.length === 0) {
    return (
      <div
        style={{
          padding: "8px 32px",
          color: "var(--color-ov-muted)",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
        }}
      >
        No steps recorded.
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "0 10px 8px 34px",
        background: "var(--color-ov-active-bg)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {steps.map((s, i) => (
        <div
          key={s.span_id ?? i}
          data-testid="workflow-step"
          style={{
            padding: "4px 0",
            borderBottom: i === steps.length - 1 ? "none" : "1px dashed var(--color-ov-border)",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ flex: "0 0 200px" }}>{s.step_name}</span>
            <span
              style={{
                flex: "0 0 80px",
                color: s.status === "failed" ? "var(--color-ov-urgent)" : "var(--color-ov-provider)",
                fontWeight: 700,
              }}
            >
              {s.status}
            </span>
            <span style={{ flex: "0 0 80px" }}>{fmtDuration(s.started_at, s.ended_at)}</span>
            <span style={{ flex: "0 0 60px" }}>attempt {s.attempt}</span>
          </div>
          {s.error && (
            <div style={{ color: "var(--color-ov-urgent)", paddingTop: 2 }}>
              {s.error.type}: {s.error.message}
            </div>
          )}
          {s.result && (
            <div
              style={{
                color: "var(--color-ov-sub)",
                paddingTop: 2,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {previewResult(s.result)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

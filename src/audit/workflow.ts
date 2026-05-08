import { openAuditDb } from "./db";
import { traceId, spanId } from "./spanIds";
import type { WorkflowName, WorkflowState, StepRecord, AuditRecord } from "./types";
import {
  writeWorkflowStart,
  writeStepComplete,
  writeStepFailed,
  writeWorkflowComplete,
  writeWorkflowFailed,
} from "./workflowDb";
import { getSession } from "./session";
import { ATTR } from "./attrs";
import { EVENT } from "./events";
import * as superjson from "superjson";
import { ulid } from "./ulid";

export interface StepOpts {
  /** Persist `result` into the durable journal so a replay after
   *  tab-kill can skip re-running this step. Default true. Set to
   *  false for steps that return binary buffers (Float32Array, etc.) —
   *  serialising a multi-MB payload per call accumulates gigabytes in
   *  the workflows store with no replay benefit (e.g. audio cache
   *  writes are idempotent). When false, replay re-executes the step. */
  memoize?: boolean;
}

export interface StepCtx {
  step<T>(name: string, fn: () => Promise<T>, opts?: StepOpts): Promise<T>;
  readonly workflowId: string;
}

export interface WorkflowOpts {
  patientIdHash?: string;
  recoveryMode?: "auto" | "prompt" | "manual";
}

function makeSpan(
  name: string,
  workflowId: string,
  startTime: number,
  endTime: number,
  statusCode: "OK" | "ERROR",
  extraAttrs: Record<string, string | number | boolean | null> = {},
): AuditRecord {
  const session = getSession();
  return {
    id: ulid(),
    kind: "span",
    time: endTime,
    observed_time: endTime,
    name,
    workflow_id: workflowId,
    trace_id: workflowId,
    span_id: spanId(),
    span_name: name,
    span_start_time: startTime,
    span_end_time: endTime,
    span_status_code: statusCode,
    severity_number: statusCode === "ERROR" ? 17 : 9,
    severity_text: statusCode === "ERROR" ? "ERROR" : "INFO",
    patient_id_hash: session.patientIdHash,
    attributes: {
      [ATTR.WORKFLOW_ID]: workflowId,
      [ATTR.SESSION_ID]: session.sessionId,
      ...extraAttrs,
    },
  };
}

async function runWorkflow<T>(
  name: WorkflowName,
  runner: (ctx: StepCtx) => Promise<T>,
  opts?: WorkflowOpts,
): Promise<T> {
  const db = await openAuditDb();
  const workflowId = traceId();
  const startedAt = Date.now();
  const session = getSession();

  let state: WorkflowState = {
    workflow_id: workflowId,
    name,
    status: "running",
    started_at: startedAt,
    patient_id_hash: opts?.patientIdHash ?? session.patientIdHash,
    attempt: 1,
    step_history: [],
  };

  const startSpan = makeSpan(
    EVENT.WORKFLOW_START,
    workflowId,
    startedAt,
    startedAt,
    "OK",
    { [ATTR.WORKFLOW_NAME]: name },
  );
  await writeWorkflowStart(db, state, startSpan);

  const ctx: StepCtx = {
    workflowId,
    async step<S>(stepName: string, fn: () => Promise<S>, opts?: StepOpts): Promise<S> {
      const memoize = opts?.memoize !== false;
      // Replay path: if a completed step with this name + attempt exists,
      // return memoised result without calling fn. Steps with memoize=false
      // never persist a result, so prior.result is undefined and the step
      // re-executes — caller is responsible for ensuring re-execution is
      // safe (e.g. idempotent write).
      const prior = state.step_history.find(
        (s) => s.step_name === stepName && s.attempt === state.attempt,
      );
      if (prior?.status === "completed" && prior.result !== undefined) {
        return superjson.parse<S>(prior.result);
      }
      if (prior?.status === "failed" && prior.error) {
        const e = new Error(prior.error.message);
        e.name = prior.error.type;
        throw e;
      }

      const stepStart = Date.now();
      try {
        const value = await fn();
        const stepEnd = Date.now();
        const record: StepRecord = {
          step_name: stepName,
          span_id: spanId(),
          attempt: state.attempt,
          status: "completed",
          result: memoize ? superjson.stringify(value) : undefined,
          started_at: stepStart,
          ended_at: stepEnd,
        };
        state = { ...state, step_history: [...state.step_history, record] };
        const span = makeSpan(
          EVENT.STEP_COMPLETE,
          workflowId,
          stepStart,
          stepEnd,
          "OK",
          { [ATTR.STEP_NAME]: stepName, [ATTR.STEP_ATTEMPT]: state.attempt },
        );
        await writeStepComplete(db, state, span);
        return value;
      } catch (err) {
        const stepEnd = Date.now();
        const record: StepRecord = {
          step_name: stepName,
          span_id: spanId(),
          attempt: state.attempt,
          status: "failed",
          error: {
            type: err instanceof Error ? err.name : "unknown",
            message: err instanceof Error ? err.message : String(err),
          },
          started_at: stepStart,
          ended_at: stepEnd,
        };
        state = {
          ...state,
          status: "failed",
          step_history: [...state.step_history, record],
          ended_at: stepEnd,
        };
        const span = makeSpan(
          EVENT.STEP_FAILED,
          workflowId,
          stepStart,
          stepEnd,
          "ERROR",
          {
            [ATTR.STEP_NAME]: stepName,
            [ATTR.STEP_ATTEMPT]: state.attempt,
            [ATTR.ERROR_MESSAGE]: record.error!.message,
            [ATTR.ERROR_TYPE]: record.error!.type,
          },
        );
        await writeStepFailed(db, state, span);
        throw err;
      }
    },
  };

  try {
    const result = await runner(ctx);
    const endedAt = Date.now();
    state = { ...state, status: "completed", ended_at: endedAt };
    const span = makeSpan(
      EVENT.WORKFLOW_COMPLETE,
      workflowId,
      startedAt,
      endedAt,
      "OK",
    );
    await writeWorkflowComplete(db, state, span);
    db.close();
    return result;
  } catch (err) {
    const endedAt = Date.now();
    if (state.status !== "failed") {
      state = { ...state, status: "failed", ended_at: endedAt };
    }
    const span = makeSpan(
      EVENT.WORKFLOW_FAILED,
      workflowId,
      startedAt,
      endedAt,
      "ERROR",
      { [ATTR.ERROR_MESSAGE]: err instanceof Error ? err.message : String(err) },
    );
    await writeWorkflowFailed(db, state, span);
    db.close();
    throw err;
  }
}

export const ov = { workflow: runWorkflow };

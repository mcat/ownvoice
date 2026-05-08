export type AttrValue = string | number | boolean | null;

export type SeverityText = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface AuditRecord {
  id: string;
  kind: "log" | "span";
  time: number;
  observed_time: number;
  name: string;
  body?: string;

  patient_id_hash?: string;
  workflow_id?: string;
  severity_number?: number;
  severity_text?: SeverityText;

  trace_id?: string;
  span_id?: string;
  parent_span_id?: string;
  span_name?: string;
  span_start_time?: number;
  span_end_time?: number;
  span_status_code?: "OK" | "ERROR" | "UNSET";

  attributes: Record<string, AttrValue>;
}

export type WorkflowName =
  | "voice_enrollment"
  | "audio_cache_pregen"
  | "model_priming";

export interface StepRecord {
  step_name: string;
  span_id: string;
  attempt: number;
  status: "completed" | "failed";
  result?: string;
  error?: { type: string; message: string };
  started_at: number;
  ended_at: number;
}

export interface WorkflowState {
  workflow_id: string;
  name: WorkflowName;
  status: "running" | "completed" | "failed" | "abandoned";
  started_at: number;
  ended_at?: number;
  patient_id_hash?: string;
  attempt: number;
  step_history: StepRecord[];
}

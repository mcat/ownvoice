import type { WorkflowName } from "./types";

interface StepCtxRef {
  step<T>(name: string, fn: () => Promise<T>): Promise<T>;
  readonly workflowId: string;
}

export type WorkflowRunner = (ctx: StepCtxRef) => Promise<unknown>;

const runners = new Map<WorkflowName, WorkflowRunner>();

export function registerWorkflow(name: WorkflowName, runner: WorkflowRunner): void {
  runners.set(name, runner);
}

export function getWorkflowRunner(name: WorkflowName): WorkflowRunner | undefined {
  return runners.get(name);
}

export function _resetRegistryForTests(): void {
  runners.clear();
}

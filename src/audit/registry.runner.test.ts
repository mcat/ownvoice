import { describe, it, expect, beforeEach } from "vitest";
import {
  registerWorkflow, getWorkflowRunner, _resetRegistryForTests,
} from "./registry";

describe("workflow registry", () => {
  beforeEach(_resetRegistryForTests);

  it("returns a registered runner by name", () => {
    const runner = async () => "ok";
    registerWorkflow("voice_enrollment", runner);
    expect(getWorkflowRunner("voice_enrollment")).toBe(runner);
  });

  it("returns undefined for unregistered names", () => {
    expect(getWorkflowRunner("voice_enrollment")).toBeUndefined();
  });

  it("overwrites prior registration with the same name", () => {
    const a = async () => "a";
    const b = async () => "b";
    registerWorkflow("voice_enrollment", a);
    registerWorkflow("voice_enrollment", b);
    expect(getWorkflowRunner("voice_enrollment")).toBe(b);
  });
});

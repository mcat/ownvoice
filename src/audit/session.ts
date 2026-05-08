import { ulid } from "./ulid";

interface Session {
  sessionId: string;
  patientIdHash: string | undefined;
}

let session: Session = { sessionId: ulid(), patientIdHash: undefined };

export function getSession(): Readonly<Session> {
  return session;
}

export function setActivePatientHash(hash: string | null): void {
  session = { ...session, patientIdHash: hash ?? undefined };
}

/** Test-only — resets the in-memory session. */
export function resetSessionForTests(): void {
  session = { sessionId: ulid(), patientIdHash: undefined };
}

import { isDomainError, type DomainErrorCode } from "@/lib/sequences";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: DomainErrorCode; error: string };

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function actionError(code: DomainErrorCode, error: string): ActionResult<never> {
  return { ok: false, code, error };
}

/** Maps thrown domain errors to a result; anything unexpected becomes a generic failure. */
export function toActionError(error: unknown): ActionResult<never> {
  if (isDomainError(error)) return actionError(error.code, error.message);
  console.error("[action] unexpected error", error);
  return actionError("invalid", "Something went wrong. Please try again.");
}
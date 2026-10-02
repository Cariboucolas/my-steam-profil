import type { Result } from "@steam/domain";

import type { ProgressError } from "../api-client";

/**
 * An expected failure, thrown. A query knows a failure only as something its
 * function threw, so this is the shape one takes on the way through the cache,
 * and `code` is how a page reads the `ApiError` or `ProgressError` back.
 */
export class ApiFailure<Code extends ProgressError = ProgressError> extends Error {
  readonly code: Code;

  constructor(code: Code) {
    super(code);
    this.name = "ApiFailure";
    this.code = code;
  }
}

/**
 * What a query function answers with, from what the `ApiClient` answered: the
 * value, or a thrown `ApiFailure`.
 *
 * The one place in the app that throws for an expected failure. The port still
 * answers `Result`, and nothing outside a query function calls this (ADR-0002).
 */
export const valueOrThrow = <Value, Code extends ProgressError>(
  answer: Result<Value, Code>,
): Value => {
  if (answer.ok) {
    return answer.value;
  }
  throw new ApiFailure(answer.error);
};

import type { Result } from "@steam/domain";

import type { ApiError, ProgressError } from "../api-client";

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

/**
 * The failure a screen can put in words, read back from what a query failed
 * with. The port answers a `Result` and never rejects (ADR-0002), so a query
 * fails with an `ApiFailure`; were anything else thrown, the screen says the
 * backend could not be reached and offers to ask again, rather than wait on an
 * answer that will not come.
 *
 * `NOT_LOADED` is read the same way: it is an answer about one game and no
 * failure, and a query function that lets it through as one has a bug.
 */
export const codeOf = (failure: Error): ApiError =>
  failure instanceof ApiFailure && failure.code !== "NOT_LOADED" ? failure.code : "UNAVAILABLE";

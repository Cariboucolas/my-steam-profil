/**
 * A query that had an answer and failed when asked again keeps both, and stays
 * failed while it asks once more. That wait is a load like the first one.
 */
export const isAskingAgain = (load: {
  readonly isError: boolean;
  readonly isFetching: boolean;
}): boolean => load.isError && load.isFetching;

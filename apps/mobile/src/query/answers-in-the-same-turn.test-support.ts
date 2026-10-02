import { notifyManager } from "@tanstack/react-query";

/**
 * Loaded by Jest before every test file. The cache tells its readers about an
 * answer one timer tick after it lands, so as to batch what lands together. A
 * test awaits promises, not ticks: left as it is, the screen would hear of the
 * answer after the `act` that awaited it had closed, or after the test itself.
 * Here the readers are told in the turn the answer lands, as they are by a
 * promise setting state.
 */
notifyManager.setScheduler(queueMicrotask);

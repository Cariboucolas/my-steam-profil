/**
 * expo-router turns every file under a router root into a route: its
 * require.context excludes `+html` and `*+api` and nothing else. A test file
 * left there is published — it becomes a route in the web bundle and drags the
 * testing library in with it, while `expo export` reports success. Jest is no
 * help either, since testMatch deliberately no longer looks in the router root,
 * so nothing runs the file and nothing mentions it. This finds it.
 */
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

/** Paths are relative to the router root, slash-separated. */
export const testFilesTheRouterWouldPublish = (
  routerFiles: readonly string[],
): readonly string[] => routerFiles.filter((one) => TEST_FILE.test(one));

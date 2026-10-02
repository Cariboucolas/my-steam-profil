import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { createAppQueryClient } from "./query-client";

/**
 * The app's cache, except that it collects nothing on a timer. It lives no
 * longer than one test or one story, and an entry left to expire five minutes
 * after its last reader holds a timer a test run would wait on.
 */
const createShortLivedQueryClient = () => createAppQueryClient({ gcTime: Infinity });

/**
 * Serves what it wraps from a cache of its own, built when it mounts: what one
 * test or one story loaded is never there for the next. The app does not use
 * this; it keeps one cache above its routes.
 */
export function FreshQueries({ children }: { readonly children: ReactNode }) {
  const [client] = useState(createShortLivedQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

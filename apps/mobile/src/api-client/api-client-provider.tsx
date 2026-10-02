import { createContext, type ReactNode, useContext } from "react";

import type { ApiClient } from "./api-client";
import { createApiClient } from "./index";

/** How a client is made for the profile chosen. */
export type CreateApiClient = (steamId: string) => ApiClient;

/**
 * The app's own backend unless something above says otherwise. A default
 * rather than a required provider, so the app needs no wiring it did not need
 * before, and the tests that cut at `createApiClient` still cut at the same
 * place (ADR-0022).
 */
const ApiClientFactory = createContext<CreateApiClient>(createApiClient);

type Props = {
  /**
   * Must keep a stable identity across renders — build it at module scope, or
   * memoise it. The client is remade whenever this changes, and every load a
   * page started off the old one starts again.
   */
  readonly create: CreateApiClient;
  readonly children: ReactNode;
};

/**
 * Decides where the pages below get their data: the seam a story serves
 * fixtures through, so a page shows its real loading path without the router
 * or the network (ADR-0022).
 */
export function ApiClientProvider({ create, children }: Props) {
  return <ApiClientFactory.Provider value={create}>{children}</ApiClientFactory.Provider>;
}

export const useCreateApiClient = (): CreateApiClient => useContext(ApiClientFactory);

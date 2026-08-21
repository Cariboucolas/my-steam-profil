import { SteamId } from "@steam/domain";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SteamIdStorage } from "./steam-id-storage";

/** Which profile the app is showing, if it knows yet. */
export type SteamIdState =
  /** The device store has not answered. Nothing should be fetched. */
  | { readonly status: "loading" }
  /** Nobody has said which profile to show. */
  | { readonly status: "absent" }
  | { readonly status: "known"; readonly steamId: string };

export type SteamIdContextValue = {
  readonly state: SteamIdState;
  /**
   * Validates through the domain and stores. Answers false for anything that
   * is not a SteamID64 — without touching the network, so a typo costs nothing
   * and cannot be aimed at the backend.
   */
  remember(raw: string): Promise<boolean>;
  forget(): Promise<void>;
};

const SteamIdContext = createContext<SteamIdContextValue | undefined>(undefined);

type Props = {
  /**
   * Must keep a stable identity across renders — build it at module scope, not
   * in a component body. It is a dependency of the effect that reads the
   * device, and a fresh object every render would restart that read, set state,
   * and render again, without end.
   */
  readonly storage: SteamIdStorage;
  /**
   * What a fresh install starts on, when the build was given one. Explicitly
   * "| undefined" because exactOptionalPropertyTypes otherwise refuses the
   * absent environment variable this almost always is. Same stability
   * requirement as `storage`: it is in the same dependency array.
   */
  readonly fallback?: string | undefined;
  readonly children: ReactNode;
};

export function SteamIdProvider({ storage, fallback, children }: Props) {
  const [state, setState] = useState<SteamIdState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    void storage.read().then((stored) => {
      if (cancelled) return;
      // The device wins over the build: someone who typed an id meant it.
      const steamId = stored ?? fallback;
      setState(
        steamId === undefined
          ? { status: "absent" }
          : { status: "known", steamId },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [storage, fallback]);

  const remember = useCallback(
    async (raw: string) => {
      const steamId = SteamId.create(raw.trim());
      if (!steamId.ok) {
        return false;
      }
      await storage.write(steamId.value.value);
      setState({ status: "known", steamId: steamId.value.value });
      return true;
    },
    [storage],
  );

  const forget = useCallback(async () => {
    await storage.forget();
    setState({ status: "absent" });
  }, [storage]);

  const value = useMemo(
    () => ({ state, remember, forget }),
    [state, remember, forget],
  );

  return <SteamIdContext.Provider value={value}>{children}</SteamIdContext.Provider>;
}

export const useSteamId = (): SteamIdContextValue => {
  const value = useContext(SteamIdContext);
  if (value === undefined) {
    // A screen outside the provider would silently never load anything.
    throw new Error("useSteamId must be used inside a SteamIdProvider");
  }
  return value;
};

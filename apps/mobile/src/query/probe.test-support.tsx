import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";

/**
 * Shows an answer kept for the session: a cache that already held it would
 * never call `ask` again, so how often `ask` ran says whether two renders
 * shared one.
 */
export function Probe({ ask }: { readonly ask: () => Promise<string> }) {
  const { data } = useQuery({ queryKey: ["probe"], queryFn: ask, staleTime: Infinity });

  return <Text>{data ?? "asking"}</Text>;
}

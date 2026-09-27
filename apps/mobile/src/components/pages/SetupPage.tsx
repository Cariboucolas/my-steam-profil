import { useSteamId } from "../../settings/steam-id-store";
import { SteamIdForm } from "../organisms/SteamIdForm";
import { SetupTemplate } from "../templates/SetupTemplate";

type Props = {
  /**
   * Leaves for the library, whether a profile was just chosen, forgotten, or
   * the reader cancelled. The route decides how: it knows what the history
   * holds and the page does not.
   */
  readonly onLeave: () => void;
};

/**
 * Choosing which profile to show (ADR-0022). Loads nothing from the API; what
 * it reads and writes is the device's own record of the profile.
 */
export function SetupPage({ onLeave }: Props) {
  const { state, remember, forget } = useSteamId();

  const submit = async (raw: string) => {
    const accepted = await remember(raw);
    if (accepted) {
      onLeave();
    }
    return accepted;
  };

  const forgetSteamId = async () => {
    await forget();
    // The library underneath now redirects here, but only once it has focus:
    // back to it, and its redirect replaces it with a single first-run form.
    // Staying put instead would leave this screen over a library with nothing
    // to show, for back to reveal.
    onLeave();
  };

  // The way back and the way out both need a profile to act on.
  const known = state.status === "known";

  return (
    <SetupTemplate
      form={
        <SteamIdForm
          onSubmit={submit}
          onCancel={known ? onLeave : undefined}
          onForget={known ? () => void forgetSteamId() : undefined}
        />
      }
    />
  );
}

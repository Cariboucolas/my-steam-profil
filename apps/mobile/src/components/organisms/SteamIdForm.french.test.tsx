import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { I18nextProvider } from "react-i18next";

import { i18nFor } from "../../i18n/i18n";
import { SteamIdForm } from "./SteamIdForm";

const inFrench = (form: React.ReactElement) =>
  render(<I18nextProvider i18n={i18nFor("fr")}>{form}</I18nextProvider>);

describe("SteamIdForm in French", () => {
  it("asks, refuses and offers its ways out in French", async () => {
    inFrench(
      <SteamIdForm
        onSubmit={() => Promise.resolve(false)}
        onCancel={() => {}}
        onForget={() => {}}
      />,
    );

    expect(screen.getByText("Quel profil Steam ?")).toBeTruthy();
    expect(screen.getByText("Un SteamID64 — dix-sept chiffres.")).toBeTruthy();
    expect(screen.getByLabelText("SteamID64")).toBeTruthy();
    expect(screen.getByText("Annuler")).toBeTruthy();
    expect(screen.getByText("Oublier ce profil")).toBeTruthy();

    fireEvent.press(screen.getByText("Afficher ce profil"));

    await waitFor(() => expect(screen.getByText(/^Ce n'est pas un SteamID64\./)).toBeTruthy());
    expect(screen.queryByText("Cancel")).toBeNull();
  });
});

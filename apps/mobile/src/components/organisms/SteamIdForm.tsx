import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fonts, radius, spacing } from "../../theme/tokens";

/** A SteamID64 is exactly this long, which is the fact that fixes a typo. */
const STEAM_ID_LENGTH = 17;

type Props = {
  /** Answers false when the value is not a SteamID64. */
  readonly onSubmit: (raw: string) => Promise<boolean>;
  /** Absent when there is no profile to go back to. */
  readonly onCancel?: (() => void) | undefined;
  /** Absent when there is no SteamID stored to forget. */
  readonly onForget?: (() => void) | undefined;
};

export function SteamIdForm({ onSubmit, onCancel, onForget }: Props) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState("");
  const [refused, setRefused] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    setBusy(true);
    try {
      const accepted = await onSubmit(raw);
      // The value stays in the field: retyping seventeen digits to fix one of
      // them is the kind of thing that makes people give up.
      setRefused(!accepted);
    } catch {
      // onSubmit is not expected to reject now that the store's failures are
      // handled below it. If one ever does, a refusal is still better than a
      // button disabled for good with nothing said.
      setRefused(true);
    } finally {
      setBusy(false);
    }
  }, [onSubmit, raw]);

  const edit = useCallback((next: string) => {
    setRaw(next);
    setRefused(false);
  }, []);

  return (
    <View style={styles.form}>
      <Text style={styles.title}>{t("form.title")}</Text>
      <Text style={styles.hint}>{t("form.hint")}</Text>

      <TextInput
        accessibilityLabel={t("form.input")}
        value={raw}
        onChangeText={edit}
        onSubmitEditing={() => void submit()}
        placeholder="76561197960287930"
        placeholderTextColor={colors.textFaint}
        keyboardType="number-pad"
        autoCorrect={false}
        maxLength={STEAM_ID_LENGTH}
        style={styles.input}
      />

      {refused ? <Text style={styles.error}>{t("form.refused")}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void submit()}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>{t("form.submit")}</Text>
      </Pressable>

      {onCancel ? (
        <Pressable accessibilityRole="button" onPress={onCancel}>
          <Text style={styles.secondary}>{t("form.cancel")}</Text>
        </Pressable>
      ) : null}

      {onForget ? (
        <Pressable accessibilityRole="button" onPress={onForget}>
          <Text style={styles.secondary}>{t("form.forget")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
  button: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.accent,
  },
  secondary: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textDim,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
});

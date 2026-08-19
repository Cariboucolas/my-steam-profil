import { Text, View } from "react-native";

import { colors } from "../src/theme/tokens";

export default function LibraryScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bg,
      }}
    >
      <Text style={{ color: colors.text }}>Library</Text>
    </View>
  );
}

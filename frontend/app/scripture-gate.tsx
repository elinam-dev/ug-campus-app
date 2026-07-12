import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fonts, space, type as t } from "@/src/theme";
import { markSeenToday } from "@/src/utils/scriptureGate";

type Scripture = { ref: string; text: string };

export default function ScriptureGate() {
  const router = useRouter();
  const [verse, setVerse] = useState<Scripture | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<Scripture>("/scripture/today");
        setVerse(s);
      } catch {
        setVerse({ ref: "Proverbs 3:5", text: "Trust in the Lord with all your heart." });
      }
    })();
  }, []);

  async function enter() {
    await markSeenToday();
    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.rule} />
        <Text style={styles.label}>Verse of the day · {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Text>
      </View>

      <View style={styles.body}>
        {verse ? (
          <>
            <Text testID="scripture-ref" style={styles.ref}>{verse.ref}</Text>
            <Text testID="scripture-text" style={styles.verse}>&ldquo;{verse.text}&rdquo;</Text>
          </>
        ) : (
          <ActivityIndicator color={colors.gold500} />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>Take a breath. Then step onto campus.</Text>
        <Pressable
          testID="scripture-enter-button"
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          onPress={enter}
        >
          <Text style={styles.btnText}>ENTER CAMPUS →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy900, padding: space.lg, justifyContent: "space-between" },
  header: { paddingTop: space.md },
  rule: { width: 48, height: 3, backgroundColor: colors.gold500, marginBottom: space.md },
  label: { ...t.label, color: colors.gold400, fontFamily: fonts.mono, letterSpacing: 1 },
  body: { flex: 1, justifyContent: "center" },
  ref: { ...t.label, color: colors.gold500, marginBottom: space.md, fontSize: 13, letterSpacing: 2 },
  verse: {
    color: "#F7F3E7",
    fontFamily: fonts.heading,
    fontSize: 30,
    lineHeight: 42,
    fontWeight: "600",
  },
  footer: { paddingBottom: space.md },
  footerNote: { ...t.body, color: "#A9B0BF", marginBottom: space.md, fontStyle: "italic" },
  btn: { backgroundColor: colors.gold500, paddingVertical: space.md, alignItems: "center" },
  btnText: { ...t.bodyBold, color: colors.navy900, letterSpacing: 2 },
});

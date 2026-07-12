import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, space, type as t } from "@/src/theme";

type Program = { id: string; name: string };

export default function Onboarding() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [program, setProgram] = useState<string>(user?.program || "");
  const [level, setLevel] = useState<string>(user?.level || "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([api<Program[]>("/programs"), api<string[]>("/levels")]);
      setPrograms(p);
      setLevels(l);
    })();
  }, []);

  async function onSubmit() {
    setErr(null);
    if (!name.trim() || !program || !level) {
      setErr("Please complete all fields");
      return;
    }
    setBusy(true);
    try {
      const u = await api("/me/onboarding", {
        method: "POST",
        body: { name: name.trim(), program, level },
      });
      setUser(u);
      router.replace("/courses");
    } catch (e: any) {
      setErr(e?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>Step 1 of 2</Text>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>We use this to build your personal timetable.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              testID="onboarding-name-input"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { marginTop: space.lg }]}>PROGRAM</Text>
            <View style={styles.chipRow}>
              {programs.map((p) => {
                const active = p.id === program;
                return (
                  <Pressable
                    key={p.id}
                    testID={`onboarding-program-${p.id}`}
                    onPress={() => setProgram(p.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { marginTop: space.lg }]}>LEVEL</Text>
            <View style={styles.chipRow}>
              {levels.map((lvl) => {
                const active = lvl === level;
                return (
                  <Pressable
                    key={lvl}
                    testID={`onboarding-level-${lvl}`}
                    onPress={() => setLevel(lvl)}
                    style={[styles.chip, styles.chipSm, active && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { fontFamily: fonts.mono },
                        active && styles.chipTextActive,
                      ]}
                    >
                      {lvl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {err ? (
              <Text testID="onboarding-error" style={styles.err}>
                {err}
              </Text>
            ) : null}
            <Pressable
              testID="onboarding-submit-button"
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
              onPress={onSubmit}
              disabled={busy}
            >
              <Text style={styles.btnText}>{busy ? "Saving…" : "Continue → Pick courses"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, padding: space.lg },
  eyebrow: { ...t.label, color: colors.sage700 },
  title: { ...t.h1, color: colors.navy900, marginTop: space.xs },
  subtitle: { ...t.body, color: colors.textMuted, marginTop: space.xs, marginBottom: space.lg },
  card: {
    backgroundColor: colors.surface,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  label: { ...t.label, color: colors.navy800, marginBottom: space.sm },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: colors.navy900,
    paddingVertical: space.sm,
    ...t.body,
    color: colors.text,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.navy900,
    backgroundColor: colors.surface,
  },
  chipSm: { minWidth: 64, alignItems: "center" },
  chipActive: { backgroundColor: colors.navy900 },
  chipText: { ...t.body, color: colors.navy900 },
  chipTextActive: { color: colors.gold400, fontWeight: "600" },
  btn: { marginTop: space.xl, backgroundColor: colors.navy900, paddingVertical: space.md, alignItems: "center" },
  btnText: { ...t.bodyBold, color: colors.gold400, letterSpacing: 1 },
  err: { ...t.small, color: colors.danger, marginTop: space.md },
});

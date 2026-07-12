import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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

import { useAuth } from "@/src/contexts/AuthContext";
import { colors, space, type as t } from "@/src/theme";

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("student@ug.edu.gh");
  const [password, setPassword] = useState("student123");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setErr(null);
    setBusy(true);
    try {
      const u = await signIn(email.trim(), password);
      if (!u.onboarded) router.replace("/onboarding");
      else router.replace("/scripture-gate");
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.crest}>
              <Feather name="book-open" size={24} color={colors.gold500} />
            </View>
            <Text style={styles.eyebrow}>University of Ghana</Text>
            <Text style={styles.title}>UG Campus</Text>
            <Text style={styles.subtitle}>
              Your timetable, resources and daily walk — all in one place.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>EMAIL</Text>
            <TextInput
              testID="login-email-input"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="name@ug.edu.gh"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { marginTop: space.md }]}>PASSWORD</Text>
            <TextInput
              testID="login-password-input"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
            />
            {err ? (
              <Text testID="login-error" style={styles.err}>
                {err}
              </Text>
            ) : null}
            <Pressable
              testID="login-submit-button"
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
              onPress={onSubmit}
              disabled={busy}
            >
              <Text style={styles.btnText}>{busy ? "Signing in…" : "Sign in"}</Text>
            </Pressable>
            <Pressable
              testID="go-to-signup-link"
              onPress={() => router.push("/signup")}
              style={{ marginTop: space.md }}
            >
              <Text style={styles.linkText}>
                New here? <Text style={{ color: colors.navy900, fontWeight: "700" }}>Create an account</Text>
              </Text>
            </Pressable>
          </View>

          <Text style={styles.demoNote}>
            Demo: student@ug.edu.gh / student123 · admin@ug.edu.gh / admin123
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy900 },
  scroll: { flexGrow: 1, padding: space.lg },
  header: { paddingTop: space.xl, paddingBottom: space.xl },
  crest: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.gold500,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  eyebrow: { ...t.label, color: colors.gold400, marginBottom: space.sm },
  title: { ...t.h1, color: "#F7F3E7", fontSize: 40 },
  subtitle: { ...t.body, color: "#C7CBD4", marginTop: space.sm, maxWidth: 320 },
  card: {
    backgroundColor: colors.surface,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  label: { ...t.label, color: colors.navy800, marginBottom: space.xs },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: colors.navy900,
    paddingVertical: space.sm,
    ...t.body,
    color: colors.text,
  },
  btn: {
    marginTop: space.lg,
    backgroundColor: colors.navy900,
    paddingVertical: space.md,
    alignItems: "center",
  },
  btnText: { ...t.bodyBold, color: colors.gold400, letterSpacing: 1 },
  linkText: { ...t.body, color: colors.textMuted, textAlign: "center" },
  err: { ...t.small, color: colors.danger, marginTop: space.md },
  demoNote: {
    ...t.small,
    color: "#8A93A5",
    textAlign: "center",
    marginTop: space.lg,
    fontFamily: "monospace",
  },
});

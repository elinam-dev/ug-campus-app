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

export default function Signup() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setErr(null);
    if (password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/onboarding");
    } catch (e: any) {
      setErr(e?.message || "Signup failed");
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
          <Pressable onPress={() => router.back()} style={styles.back} testID="signup-back">
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>Create your account</Text>
          <Text style={styles.title}>Join the Campus</Text>
          <Text style={styles.subtitle}>Set up in under a minute.</Text>

          <View style={styles.card}>
            <Text style={styles.label}>FULL NAME</Text>
            <TextInput
              testID="signup-name-input"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Kwame Boateng"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { marginTop: space.md }]}>EMAIL</Text>
            <TextInput
              testID="signup-email-input"
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
              testID="signup-password-input"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
            />
            {err ? (
              <Text testID="signup-error" style={styles.err}>
                {err}
              </Text>
            ) : null}
            <Pressable
              testID="signup-submit-button"
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
              onPress={onSubmit}
              disabled={busy}
            >
              <Text style={styles.btnText}>{busy ? "Creating…" : "Create account"}</Text>
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
  back: { paddingVertical: space.sm },
  backText: { ...t.body, color: colors.navy900 },
  eyebrow: { ...t.label, color: colors.sage700, marginTop: space.md },
  title: { ...t.h1, color: colors.navy900, marginTop: space.xs },
  subtitle: { ...t.body, color: colors.textMuted, marginTop: space.xs, marginBottom: space.lg },
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
  btn: { marginTop: space.lg, backgroundColor: colors.navy900, paddingVertical: space.md, alignItems: "center" },
  btnText: { ...t.bodyBold, color: colors.gold400, letterSpacing: 1 },
  err: { ...t.small, color: colors.danger, marginTop: space.md },
});

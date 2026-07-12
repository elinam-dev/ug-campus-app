import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, space, type as t } from "@/src/theme";

type Course = {
  id: string;
  code: string;
  title: string;
  credit: number;
  program: string;
  level: string;
};

export default function Courses() {
  const router = useRouter();
  const { user } = useAuth();
  const [all, setAll] = useState<Course[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.program || !user?.level) return;
    setLoading(true);
    const [courses, mine] = await Promise.all([
      api<Course[]>(`/courses?program=${user.program}&level=${user.level}`),
      api<Course[]>("/me/courses"),
    ]);
    setAll(courses);
    setSelected(mine.map((c) => c.id));
    setLoading(false);
  }, [user?.program, user?.level]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    setSaving(true);
    try {
      await api("/me/courses", { method: "POST", body: { course_ids: selected } });
      router.replace("/(tabs)");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="courses-back" onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>PICK YOUR COURSES</Text>
          <Text style={styles.title}>Semester registration</Text>
          <Text style={styles.subtitle}>
            {user?.program?.toUpperCase()} · Level <Text style={styles.mono}>{user?.level}</Text>
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: space.xl }} color={colors.navy900} />
      ) : (
        <FlatList
          data={all}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
          renderItem={({ item }) => {
            const isSel = selected.includes(item.id);
            return (
              <Pressable
                testID={`course-item-${item.code}`}
                onPress={() => toggle(item.id)}
                style={styles.row}
              >
                <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                  {isSel ? <Feather name="check" size={16} color={colors.gold400} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>{item.code}</Text>
                  <Text style={styles.courseTitle}>{item.title}</Text>
                </View>
                <Text style={styles.credit}>{item.credit}cr</Text>
              </Pressable>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.count}>
          <Text style={styles.mono}>{selected.length}</Text> selected
        </Text>
        <Pressable
          testID="courses-save-button"
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          onPress={save}
          disabled={saving}
        >
          <Text style={styles.btnText}>{saving ? "Saving…" : "Save & Continue"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { ...t.h2, color: colors.navy900 },
  eyebrow: { ...t.label, color: colors.sage700 },
  title: { ...t.h2, color: colors.navy900, marginTop: 2 },
  subtitle: { ...t.body, color: colors.textMuted, marginTop: 2 },
  mono: { fontFamily: fonts.mono, color: colors.navy900 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: space.md, gap: space.md },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    borderColor: colors.navy900,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.navy900 },
  code: { fontFamily: fonts.mono, fontSize: 14, color: colors.navy900, letterSpacing: 1 },
  courseTitle: { ...t.body, color: colors.text, marginTop: 2 },
  credit: { fontFamily: fonts.mono, fontSize: 13, color: colors.sage700 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.md,
    paddingBottom: space.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  count: { ...t.body, color: colors.textMuted },
  btn: { flex: 1, backgroundColor: colors.navy900, paddingVertical: space.md, alignItems: "center" },
  btnText: { ...t.bodyBold, color: colors.gold400, letterSpacing: 1 },
});

import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fonts, space, type as t } from "@/src/theme";

type Course = { id: string; code: string; title: string };
type Resource = {
  id: string;
  course_id: string;
  course_code: string;
  title: string;
  type: "slides" | "past_paper";
  url: string;
  uploaded_at: string;
};

export default function Resources() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "slides" | "past_paper">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([
      api<Course[]>("/me/courses"),
      api<Resource[]>("/resources"),
    ]);
    setCourses(c);
    setResources(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    return resources.filter((r) => {
      if (filter !== "all" && r.course_id !== filter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      return true;
    });
  }, [resources, filter, typeFilter]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COURSE LIBRARY</Text>
        <Text style={styles.title}>Slides & Papers</Text>
        <Text style={styles.sub}>{resources.length} items across your courses</Text>
      </View>

      <View style={styles.chipsWrap}>
        {/* Type filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {(["all", "slides", "past_paper"] as const).map((k) => {
            const active = typeFilter === k;
            const label = k === "all" ? "All" : k === "slides" ? "Slides" : "Past papers";
            return (
              <Pressable
                key={k}
                testID={`resources-type-${k}`}
                onPress={() => setTypeFilter(k)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {/* Course filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            testID="resources-course-all"
            onPress={() => setFilter("all")}
            style={[styles.chip, filter === "all" && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === "all" && styles.chipTextActive]}>All courses</Text>
          </Pressable>
          {courses.map((c) => {
            const active = filter === c.id;
            return (
              <Pressable
                key={c.id}
                testID={`resources-course-${c.code}`}
                onPress={() => setFilter(c.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, styles.chipMono, active && styles.chipTextActive]}>
                  {c.code}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: space.xl }} color={colors.navy900} />
      ) : visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyBody}>
            {courses.length === 0
              ? "Select your courses to see resources."
              : "Try clearing the filters above."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          renderItem={({ item }) => (
            <Pressable
              testID={`resource-item-${item.id}`}
              onPress={() => router.push(`/chat/${item.course_id}`)}
              style={styles.item}
            >
              <View
                style={[
                  styles.typeBadge,
                  item.type === "past_paper" ? styles.badgePaper : styles.badgeSlides,
                ]}
              >
                <Feather
                  name={item.type === "past_paper" ? "file-text" : "layers"}
                  size={14}
                  color={item.type === "past_paper" ? colors.paper : colors.navy900}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemCode}>{item.course_code}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>
                  {item.type === "past_paper" ? "Past paper" : "Slides"}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: space.lg, backgroundColor: colors.navy900 },
  eyebrow: { ...t.label, color: colors.gold400, fontFamily: fonts.mono, letterSpacing: 2 },
  title: { ...t.h1, color: "#F7F3E7", marginTop: space.xs, fontSize: 28 },
  sub: { color: "#C7CBD4", marginTop: space.xs },

  chipsWrap: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: space.sm },
  chipRow: { paddingHorizontal: space.lg, gap: space.sm, alignItems: "center", height: 56 },
  chip: {
    height: 36,
    paddingHorizontal: space.md,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.navy900,
    backgroundColor: colors.surface,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.navy900 },
  chipText: { ...t.body, fontSize: 13, color: colors.navy900 },
  chipMono: { fontFamily: fonts.mono, letterSpacing: 0.5 },
  chipTextActive: { color: colors.gold400, fontWeight: "600" },

  empty: { padding: space.lg },
  emptyTitle: { ...t.h3, color: colors.navy900 },
  emptyBody: { ...t.body, color: colors.textMuted, marginTop: space.sm },

  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeBadge: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.navy900,
  },
  badgeSlides: { backgroundColor: colors.gold500 },
  badgePaper: { backgroundColor: colors.navy900 },
  itemCode: { fontFamily: fonts.mono, fontSize: 12, color: colors.navy900, letterSpacing: 1, fontWeight: "700" },
  itemTitle: { ...t.body, color: colors.text, marginTop: 2 },
  itemMeta: { ...t.small, color: colors.textMuted, marginTop: 4 },
});

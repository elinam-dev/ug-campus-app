import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, space, type as t } from "@/src/theme";

type Scripture = { ref: string; text: string };
type TimetableEntry = {
  id: string;
  course_id: string;
  course_code: string;
  course_title: string;
  start_time: string;
  end_time: string;
  room: string;
};

type StripNode =
  | { kind: "verse"; ref: string; text: string }
  | { kind: "class"; code: string; title: string; start: string; end: string; room: string; courseId: string }
  | { kind: "free"; start: string; end: string };

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmt(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildStrip(verse: Scripture | null, classes: TimetableEntry[]): StripNode[] {
  const nodes: StripNode[] = [];
  if (verse) nodes.push({ kind: "verse", ref: verse.ref, text: verse.text });
  const sorted = [...classes].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const DAY_START = 8 * 60;
  const DAY_END = 18 * 60;
  let cursor = DAY_START;
  for (const c of sorted) {
    const s = timeToMin(c.start_time);
    const e = timeToMin(c.end_time);
    if (s - cursor >= 45) {
      nodes.push({ kind: "free", start: fmt(cursor), end: fmt(s) });
    }
    nodes.push({
      kind: "class",
      code: c.course_code,
      title: c.course_title,
      start: c.start_time,
      end: c.end_time,
      room: c.room,
      courseId: c.course_id,
    });
    cursor = e;
  }
  if (DAY_END - cursor >= 45) {
    nodes.push({ kind: "free", start: fmt(cursor), end: fmt(DAY_END) });
  }
  return nodes;
}

export default function Today() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [verse, setVerse] = useState<Scripture | null>(null);
  const [classes, setClasses] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, tt] = await Promise.all([
        api<Scripture>("/scripture/today"),
        api<TimetableEntry[]>("/timetable/today"),
      ]);
      setVerse(v);
      setClasses(tt);
    } catch {
      // ignore for demo
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const nodes = buildStrip(verse, classes);
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.gold500} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{dateStr.toUpperCase()}</Text>
            <Text style={styles.hello}>
              Akwaaba, <Text style={styles.helloName}>{user?.name?.split(" ")[0] || "student"}</Text>.
            </Text>
          </View>
          <Pressable testID="profile-signout" onPress={signOut} style={styles.iconBtn}>
            <Feather name="log-out" size={18} color={colors.gold400} />
          </Pressable>
        </View>

        {/* Today Strip — the signature element */}
        <View style={styles.stripSection}>
          <View style={styles.stripLabelRow}>
            <View style={styles.stripDash} />
            <Text style={styles.stripLabel}>TODAY&apos;S TIMELINE</Text>
          </View>
          {loading ? (
            <ActivityIndicator style={{ marginVertical: space.xl }} color={colors.gold500} />
          ) : (
            <ScrollView
              testID="today-strip"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stripInner}
            >
              {/* Continuous line */}
              <View pointerEvents="none" style={styles.stripLine} />
              {nodes.map((n, i) => (
                <StripCard
                  key={i}
                  node={n}
                  onPress={() => {
                    if (n.kind === "class") router.push(`/chat/${n.courseId}`);
                  }}
                />
              ))}
              {nodes.length <= 1 && (
                <View style={styles.emptyClasses}>
                  <Text style={styles.emptyClassesText}>No classes today.</Text>
                  <Pressable onPress={() => router.push("/courses")} testID="empty-select-courses">
                    <Text style={styles.emptyLink}>Select your courses →</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          <QuickAction
            testID="quick-planner"
            label="Day planner"
            hint="Add & merge tasks"
            icon="check-square"
            onPress={() => router.push("/(tabs)/planner")}
          />
          <QuickAction
            testID="quick-timetable"
            label="Full week"
            hint="See your timetable"
            icon="calendar"
            onPress={() => router.push("/(tabs)/timetable")}
          />
          <QuickAction
            testID="quick-resources"
            label="Slides & papers"
            hint="Course library"
            icon="book"
            onPress={() => router.push("/(tabs)/resources")}
          />
          <QuickAction
            testID="quick-courses"
            label="Manage courses"
            hint="Edit selection"
            icon="edit-3"
            onPress={() => router.push("/courses")}
          />
        </View>

        {/* Meta */}
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>PROGRAM</Text>
          <Text style={styles.metaVal}>{user?.program?.toUpperCase() || "—"}</Text>
          <View style={styles.metaDivider} />
          <Text style={styles.metaLabel}>LEVEL</Text>
          <Text style={styles.metaValMono}>{user?.level || "—"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StripCard({ node, onPress }: { node: StripNode; onPress: () => void }) {
  if (node.kind === "verse") {
    return (
      <Pressable style={[styles.card, styles.cardVerse]} onPress={onPress} testID="strip-verse">
        <View style={[styles.dot, styles.dotVerse]} />
        <Text style={styles.cardEyebrow}>VERSE · TODAY</Text>
        <Text style={styles.cardRef}>{node.ref}</Text>
        <Text style={styles.cardVerseText} numberOfLines={4}>&ldquo;{node.text}&rdquo;</Text>
      </Pressable>
    );
  }
  if (node.kind === "class") {
    return (
      <Pressable style={[styles.card, styles.cardClass]} onPress={onPress} testID={`strip-class-${node.code}`}>
        <View style={[styles.dot, styles.dotClass]} />
        <Text style={styles.cardTime}>{node.start} → {node.end}</Text>
        <Text style={styles.cardCode}>{node.code}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{node.title}</Text>
        <View style={styles.roomTag}>
          <Feather name="map-pin" size={11} color={colors.sage700} />
          <Text style={styles.roomText}>{node.room}</Text>
        </View>
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, styles.cardFree]} testID="strip-free">
      <View style={[styles.dot, styles.dotFree]} />
      <Text style={styles.cardEyebrow}>FREE SLOT</Text>
      <Text style={styles.cardTime}>{node.start} → {node.end}</Text>
      <Text style={styles.freeHint}>Deep work?</Text>
    </View>
  );
}

function QuickAction({ label, hint, icon, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.qa, pressed && { opacity: 0.85 }]}>
      <Feather name={icon} size={18} color={colors.navy900} />
      <Text style={styles.qaLabel}>{label}</Text>
      <Text style={styles.qaHint}>{hint}</Text>
    </Pressable>
  );
}

const STRIP_LINE_TOP = 88;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.navy900,
  },
  eyebrow: { ...t.label, color: colors.gold400, fontFamily: fonts.mono, letterSpacing: 2 },
  hello: { ...t.h1, color: "#F7F3E7", marginTop: space.xs, fontSize: 28 },
  helloName: { color: colors.gold400 },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.gold500,
    alignItems: "center",
    justifyContent: "center",
  },

  stripSection: {
    backgroundColor: colors.navy900,
    paddingBottom: space.lg,
  },
  stripLabelRow: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingHorizontal: space.lg, marginBottom: space.sm },
  stripDash: { width: 24, height: 2, backgroundColor: colors.gold500 },
  stripLabel: { ...t.label, color: colors.gold400, fontFamily: fonts.mono, letterSpacing: 2 },
  stripInner: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: 0, position: "relative" },
  stripLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: STRIP_LINE_TOP,
    height: 2,
    backgroundColor: colors.gold500,
    opacity: 0.6,
  },

  card: {
    width: 220,
    minHeight: 200,
    backgroundColor: colors.surface,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.navy900,
    marginRight: space.md,
  },
  cardVerse: { backgroundColor: colors.paper, borderColor: colors.gold500 },
  cardClass: { backgroundColor: colors.surface },
  cardFree: { backgroundColor: colors.sage100, borderStyle: "dashed" },

  dot: {
    position: "absolute",
    top: -8,
    left: space.md,
    width: 14,
    height: 14,
    borderWidth: 2,
    borderColor: colors.navy900,
    backgroundColor: colors.gold500,
  },
  dotVerse: { backgroundColor: colors.gold500 },
  dotClass: { backgroundColor: colors.navy900 },
  dotFree: { backgroundColor: colors.sage600 },

  cardEyebrow: { ...t.label, color: colors.textMuted, marginTop: space.sm, fontSize: 9 },
  cardRef: { fontFamily: fonts.mono, fontSize: 12, color: colors.navy900, marginTop: space.xs, letterSpacing: 1 },
  cardVerseText: { fontFamily: fonts.heading, fontSize: 15, color: colors.navy900, marginTop: space.sm, lineHeight: 22 },
  cardTime: { fontFamily: fonts.mono, fontSize: 13, color: colors.sage700, marginTop: space.sm, letterSpacing: 0.5 },
  cardCode: { fontFamily: fonts.mono, fontSize: 16, color: colors.navy900, marginTop: 4, letterSpacing: 1, fontWeight: "700" },
  cardTitle: { ...t.body, color: colors.text, marginTop: 4 },
  roomTag: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: space.sm },
  roomText: { fontFamily: fonts.mono, fontSize: 12, color: colors.sage700 },
  freeHint: { ...t.body, color: colors.sage700, marginTop: space.sm, fontStyle: "italic" },

  emptyClasses: { width: 260, padding: space.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.gold500 },
  emptyClassesText: { ...t.body, color: colors.navy900 },
  emptyLink: { ...t.bodyBold, color: colors.navy900, marginTop: space.sm, textDecorationLine: "underline" },

  quickGrid: {
    padding: space.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  qa: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    gap: 4,
  },
  qaLabel: { ...t.bodyBold, color: colors.navy900, marginTop: space.sm },
  qaHint: { ...t.small, color: colors.textMuted },

  metaCard: {
    marginHorizontal: space.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  metaLabel: { ...t.label, color: colors.textMuted, fontSize: 10 },
  metaVal: { ...t.bodyBold, color: colors.navy900, marginLeft: space.sm },
  metaValMono: { fontFamily: fonts.mono, fontSize: 15, color: colors.navy900, marginLeft: space.sm },
  metaDivider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: space.sm },
});

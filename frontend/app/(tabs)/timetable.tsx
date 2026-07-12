import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fonts, space, type as t } from "@/src/theme";

type TimetableEntry = {
  id: string;
  course_code: string;
  course_title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Timetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().getDay() - 1; // 0=Mon

  const load = useCallback(async () => {
    try {
      const data = await api<TimetableEntry[]>("/timetable/mine");
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = DAYS.map((_, i) => entries.filter((e) => e.day_of_week === i));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR WEEK</Text>
        <Text style={styles.title}>Timetable</Text>
        <Text style={styles.sub}>Semester · 2025/26 · S1</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: space.xl }} color={colors.navy900} />
      ) : entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No timetable yet</Text>
          <Text style={styles.emptyBody}>Select your courses from the Today screen to build your personal timetable.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }}>
          {grouped.map((dayItems, i) => {
            const isToday = i === today;
            return (
              <View key={i} style={styles.daySection}>
                <View style={styles.dayHead}>
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{DAY_NAMES[i]}</Text>
                  {isToday && (
                    <View style={styles.todayPill}>
                      <Text style={styles.todayPillText}>TODAY</Text>
                    </View>
                  )}
                </View>
                {dayItems.length === 0 ? (
                  <View style={styles.freeDay}>
                    <Text style={styles.freeDayText}>— no classes —</Text>
                  </View>
                ) : (
                  dayItems.map((e) => (
                    <View
                      key={e.id}
                      testID={`timetable-entry-${e.course_code}-${e.day_of_week}`}
                      style={[styles.entry, isToday && styles.entryToday]}
                    >
                      <View style={styles.timeCol}>
                        <Text style={styles.timeStart}>{e.start_time}</Text>
                        <View style={styles.timeBar} />
                        <Text style={styles.timeEnd}>{e.end_time}</Text>
                      </View>
                      <View style={styles.entryBody}>
                        <Text style={styles.entryCode}>{e.course_code}</Text>
                        <Text style={styles.entryTitle}>{e.course_title}</Text>
                        <Text style={styles.entryRoom}>Room {e.room}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: space.lg, backgroundColor: colors.navy900 },
  eyebrow: { ...t.label, color: colors.gold400, fontFamily: fonts.mono, letterSpacing: 2 },
  title: { ...t.h1, color: "#F7F3E7", marginTop: space.xs, fontSize: 30 },
  sub: { fontFamily: fonts.mono, color: "#C7CBD4", marginTop: space.xs, fontSize: 12, letterSpacing: 1 },

  empty: { padding: space.lg },
  emptyTitle: { ...t.h2, color: colors.navy900 },
  emptyBody: { ...t.body, color: colors.textMuted, marginTop: space.sm },

  daySection: { marginBottom: space.lg },
  dayHead: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm, borderBottomWidth: 2, borderBottomColor: colors.navy900, paddingBottom: 4 },
  dayName: { ...t.h3, color: colors.navy900 },
  dayNameToday: { color: colors.navy900 },
  todayPill: { backgroundColor: colors.gold500, paddingHorizontal: space.sm, paddingVertical: 2 },
  todayPillText: { fontFamily: fonts.mono, fontSize: 10, color: colors.navy900, letterSpacing: 1.5, fontWeight: "700" },

  freeDay: { padding: space.md, backgroundColor: colors.sage100 },
  freeDayText: { ...t.body, color: colors.sage700, fontStyle: "italic" },

  entry: {
    flexDirection: "row",
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: space.sm,
    backgroundColor: colors.surface,
    gap: space.md,
  },
  entryToday: { borderColor: colors.navy900, borderLeftWidth: 4, borderLeftColor: colors.gold500 },
  timeCol: { alignItems: "center", width: 56 },
  timeStart: { fontFamily: fonts.mono, fontSize: 13, color: colors.navy900, fontWeight: "700" },
  timeBar: { width: 2, height: 22, backgroundColor: colors.navy900, opacity: 0.3, marginVertical: 2 },
  timeEnd: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },
  entryBody: { flex: 1 },
  entryCode: { fontFamily: fonts.mono, fontSize: 14, color: colors.navy900, letterSpacing: 1, fontWeight: "700" },
  entryTitle: { ...t.body, color: colors.text, marginTop: 2 },
  entryRoom: { fontFamily: fonts.mono, fontSize: 12, color: colors.sage700, marginTop: 4 },
});

import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { colors, fonts, space, type as t } from "@/src/theme";

type Course = { id: string; code: string; title: string; credit: number };
type GradeRow = { course_id: string; credit: number; grade: string };
type SemesterState = { id: string; name: string; rows: GradeRow[] };

const GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E", "F"];

export default function Gpa() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<SemesterState[]>([
    { id: "s1", name: "Sem 1", rows: [] },
  ]);
  const [result, setResult] = useState<{ semesters: any[]; cgpa: number; total_credits: number } | null>(null);

  const load = useCallback(async () => {
    const c = await api<Course[]>("/me/courses");
    setCourses(c);
    if (c.length && semesters[0].rows.length === 0) {
      setSemesters([
        {
          id: "s1",
          name: "Sem 1",
          rows: c.map((x) => ({ course_id: x.id, credit: x.credit, grade: "A" })),
        },
      ]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  function updateGrade(semId: string, courseId: string, grade: string) {
    setSemesters((prev) =>
      prev.map((s) =>
        s.id === semId
          ? { ...s, rows: s.rows.map((r) => (r.course_id === courseId ? { ...r, grade } : r)) }
          : s
      )
    );
  }

  function addSemester() {
    setSemesters((prev) => [
      ...prev,
      {
        id: `s${prev.length + 1}`,
        name: `Sem ${prev.length + 1}`,
        rows: courses.map((x) => ({ course_id: x.id, credit: x.credit, grade: "A" })),
      },
    ]);
  }

  async function calc() {
    const payload = {
      semesters: semesters.map((s) => ({
        semester: s.name,
        grades: s.rows,
      })),
    };
    const r = await api<any>("/gpa/calculate", { method: "POST", body: payload });
    setResult(r);
  }

  const courseById = new Map(courses.map((c) => [c.id, c]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>ACADEMIC STANDING</Text>
        <Text style={styles.title}>GPA · CGPA</Text>
        <Text style={styles.sub}>Standard <Text style={styles.mono}>4.00</Text> scale</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }}>
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>YOUR CGPA</Text>
            <Text style={styles.resultVal}>{result.cgpa.toFixed(2)}</Text>
            <Text style={styles.resultMeta}>{result.total_credits} total credits</Text>
            <View style={styles.resultSemRow}>
              {result.semesters.map((s: any, i: number) => (
                <View key={i} style={styles.resultSem}>
                  <Text style={styles.resultSemLabel}>{s.semester}</Text>
                  <Text style={styles.resultSemVal}>{s.gpa.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {courses.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Pick your courses first</Text>
            <Text style={styles.emptyBody}>Once you select courses, they show up here for grade entry.</Text>
          </View>
        ) : (
          <>
            {semesters.map((sem, idx) => (
              <View key={sem.id} style={styles.semCard} testID={`gpa-semester-${sem.id}`}>
                <View style={styles.semHead}>
                  <Text style={styles.semName}>{sem.name}</Text>
                  <Text style={styles.semMeta}>{sem.rows.length} courses</Text>
                </View>
                {sem.rows.map((row) => {
                  const c = courseById.get(row.course_id);
                  if (!c) return null;
                  return (
                    <View key={`${sem.id}-${row.course_id}`} style={styles.gradeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowCode}>{c.code}</Text>
                        <Text style={styles.rowTitle} numberOfLines={1}>{c.title}</Text>
                      </View>
                      <Text style={styles.rowCredit}>{c.credit}cr</Text>
                      <View style={styles.gradePicker}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {GRADES.map((g) => {
                            const active = row.grade === g;
                            return (
                              <Pressable
                                key={g}
                                testID={`gpa-grade-${sem.id}-${c.code}-${g}`}
                                onPress={() => updateGrade(sem.id, row.course_id, g)}
                                style={[styles.gradeBox, active && styles.gradeBoxOn]}
                              >
                                <Text style={[styles.gradeText, active && styles.gradeTextOn]}>{g}</Text>
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            <Pressable testID="gpa-add-semester" style={styles.addSem} onPress={addSemester}>
              <Feather name="plus" size={16} color={colors.navy900} />
              <Text style={styles.addSemText}>ADD PREVIOUS SEMESTER</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {courses.length > 0 && (
        <Pressable testID="gpa-calc-button" style={styles.calcBtn} onPress={calc}>
          <Text style={styles.calcBtnText}>CALCULATE</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: space.lg, backgroundColor: colors.navy900 },
  eyebrow: { ...t.label, color: colors.gold400, fontFamily: fonts.mono, letterSpacing: 2 },
  title: { ...t.h1, color: "#F7F3E7", marginTop: space.xs, fontSize: 30 },
  sub: { color: "#C7CBD4", marginTop: space.xs },
  mono: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1 },

  empty: { padding: space.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.gold500 },
  emptyTitle: { ...t.h3, color: colors.navy900 },
  emptyBody: { ...t.body, color: colors.textMuted, marginTop: space.sm },

  resultCard: {
    padding: space.lg,
    borderWidth: 2,
    borderColor: colors.navy900,
    backgroundColor: colors.navy900,
    marginBottom: space.lg,
  },
  resultLabel: { ...t.label, color: colors.gold400, letterSpacing: 2 },
  resultVal: { fontFamily: fonts.mono, fontSize: 56, color: colors.gold500, fontWeight: "700", marginTop: space.sm },
  resultMeta: { color: "#C7CBD4", marginTop: 4 },
  resultSemRow: { flexDirection: "row", flexWrap: "wrap", gap: space.md, marginTop: space.md },
  resultSem: { paddingRight: space.md, borderRightWidth: 1, borderRightColor: "#3A4055" },
  resultSemLabel: { ...t.label, color: "#A9B0BF", fontSize: 10 },
  resultSemVal: { fontFamily: fonts.mono, fontSize: 20, color: "#F7F3E7", fontWeight: "700", marginTop: 2 },

  semCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, marginBottom: space.md },
  semHead: { padding: space.md, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.borderStrong, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  semName: { ...t.h3, color: colors.navy900 },
  semMeta: { fontFamily: fonts.mono, fontSize: 12, color: colors.textMuted },

  gradeRow: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", gap: space.sm },
  rowCode: { fontFamily: fonts.mono, fontSize: 13, color: colors.navy900, fontWeight: "700", letterSpacing: 1 },
  rowTitle: { ...t.small, color: colors.textMuted, marginTop: 2 },
  rowCredit: { fontFamily: fonts.mono, fontSize: 12, color: colors.sage700, marginHorizontal: space.sm },
  gradePicker: { maxWidth: 130 },
  gradeBox: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.navy900,
    marginLeft: 4,
  },
  gradeBoxOn: { backgroundColor: colors.navy900 },
  gradeText: { fontFamily: fonts.mono, fontSize: 12, color: colors.navy900, fontWeight: "700" },
  gradeTextOn: { color: colors.gold400 },

  addSem: { flexDirection: "row", alignItems: "center", gap: 6, padding: space.md, borderWidth: 1, borderColor: colors.navy900, borderStyle: "dashed", backgroundColor: colors.paper, justifyContent: "center" },
  addSemText: { ...t.bodyBold, color: colors.navy900, letterSpacing: 1 },

  calcBtn: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
    backgroundColor: colors.gold500,
    paddingVertical: space.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.navy900,
  },
  calcBtnText: { ...t.bodyBold, color: colors.navy900, letterSpacing: 2 },
});

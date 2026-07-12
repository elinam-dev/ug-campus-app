import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
import { colors, fonts, space, type as t } from "@/src/theme";

type Block = {
  kind: "class" | "task";
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  room?: string;
  notes?: string;
  locked?: boolean;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Planner() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [date] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [nTitle, setNTitle] = useState("");
  const [nStart, setNStart] = useState("14:00");
  const [nEnd, setNEnd] = useState("15:00");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ blocks: Block[] }>(`/planner/day?date=${date}`);
      setBlocks(r.blocks);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTask() {
    if (!nTitle.trim()) return;
    setSaving(true);
    try {
      await api("/planner/tasks", {
        method: "POST",
        body: { title: nTitle.trim(), start_time: nStart, end_time: nEnd, date },
      });
      setModal(false);
      setNTitle("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(id: string) {
    await api(`/planner/tasks/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>DAY PLANNER</Text>
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.sub}><Text style={styles.mono}>{date}</Text></Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: space.xl }} color={colors.navy900} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }}>
          {blocks.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Blank slate</Text>
              <Text style={styles.emptyBody}>No classes today. Add tasks to structure your day.</Text>
            </View>
          )}
          {blocks.map((b) => (
            <View
              key={`${b.kind}-${b.id}`}
              testID={`planner-block-${b.kind}-${b.id}`}
              style={[styles.block, b.kind === "class" ? styles.blockClass : styles.blockTask]}
            >
              <View style={styles.blockLeft}>
                <Text style={styles.blockTime}>{b.start_time}</Text>
                {b.end_time ? <Text style={styles.blockTimeEnd}>{b.end_time}</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.blockKindRow}>
                  <Feather
                    name={b.kind === "class" ? "book" : "check-square"}
                    size={12}
                    color={b.kind === "class" ? colors.gold500 : colors.sage700}
                  />
                  <Text style={styles.blockKind}>
                    {b.kind === "class" ? "CLASS · LOCKED" : "TASK"}
                  </Text>
                </View>
                <Text style={styles.blockTitle}>{b.title}</Text>
                {b.room ? <Text style={styles.blockMeta}>Room {b.room}</Text> : null}
                {b.notes ? <Text style={styles.blockMeta}>{b.notes}</Text> : null}
              </View>
              {b.kind === "task" && (
                <Pressable
                  testID={`planner-delete-${b.id}`}
                  onPress={() => deleteTask(b.id)}
                  style={styles.delBtn}
                >
                  <Feather name="x" size={16} color={colors.danger} />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <Pressable
        testID="planner-add-fab"
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}
        onPress={() => setModal(true)}
      >
        <Feather name="plus" size={22} color={colors.navy900} />
        <Text style={styles.fabText}>ADD TASK</Text>
      </Pressable>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalWrap}
        >
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New task</Text>
            <Text style={styles.label}>WHAT</Text>
            <TextInput
              testID="planner-new-title"
              style={styles.input}
              value={nTitle}
              onChangeText={setNTitle}
              placeholder="e.g. Read chapter 3"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: space.md, marginTop: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>START</Text>
                <TextInput
                  testID="planner-new-start"
                  style={[styles.input, styles.inputMono]}
                  value={nStart}
                  onChangeText={setNStart}
                  placeholder="14:00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>END</Text>
                <TextInput
                  testID="planner-new-end"
                  style={[styles.input, styles.inputMono]}
                  value={nEnd}
                  onChangeText={setNEnd}
                  placeholder="15:00"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.lg }}>
              <Pressable
                testID="planner-modal-cancel"
                onPress={() => setModal(false)}
                style={[styles.btn, styles.btnGhost, { flex: 1 }]}
              >
                <Text style={[styles.btnText, { color: colors.navy900 }]}>CANCEL</Text>
              </Pressable>
              <Pressable
                testID="planner-modal-save"
                onPress={addTask}
                style={[styles.btn, { flex: 1 }]}
                disabled={saving}
              >
                <Text style={styles.btnText}>{saving ? "SAVING…" : "ADD"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  block: {
    flexDirection: "row",
    padding: space.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginBottom: space.sm,
    gap: space.md,
  },
  blockClass: { borderColor: colors.navy900, borderLeftWidth: 4, borderLeftColor: colors.gold500 },
  blockTask: { borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.sage700 },
  blockLeft: { width: 60 },
  blockTime: { fontFamily: fonts.mono, fontSize: 15, color: colors.navy900, fontWeight: "700" },
  blockTimeEnd: { fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  blockKindRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  blockKind: { ...t.label, fontSize: 9, color: colors.textMuted },
  blockTitle: { ...t.bodyBold, color: colors.navy900, marginTop: 2 },
  blockMeta: { ...t.small, color: colors.textMuted, marginTop: 2 },
  delBtn: { padding: space.xs },

  fab: {
    position: "absolute",
    right: space.lg,
    bottom: space.lg,
    backgroundColor: colors.gold500,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: colors.navy900,
  },
  fabText: { fontFamily: fonts.body, fontWeight: "700", color: colors.navy900, letterSpacing: 1 },

  modalWrap: { flex: 1, backgroundColor: "rgba(11,19,43,0.85)", justifyContent: "flex-end" },
  modal: { backgroundColor: colors.surface, padding: space.lg, borderTopWidth: 3, borderTopColor: colors.gold500 },
  modalTitle: { ...t.h2, color: colors.navy900, marginBottom: space.md },
  label: { ...t.label, color: colors.navy800, marginBottom: 4 },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: colors.navy900,
    paddingVertical: space.sm,
    ...t.body,
    color: colors.text,
  },
  inputMono: { fontFamily: fonts.mono, fontSize: 16 },
  btn: { backgroundColor: colors.navy900, paddingVertical: space.md, alignItems: "center" },
  btnGhost: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.navy900 },
  btnText: { color: colors.gold400, fontWeight: "700", letterSpacing: 1 },
});

import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/src/api/client";
import { useAuth } from "@/src/contexts/AuthContext";
import { colors, fonts, space, type as t } from "@/src/theme";

type Message = {
  id: string;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
};

type Course = { id: string; code: string; title: string };

export default function CourseChat() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<any>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const loadCourse = useCallback(async () => {
    try {
      const my = await api<Course[]>("/me/courses");
      setCourse(my.find((c) => c.id === courseId) || null);
    } catch {}
  }, [courseId]);

  const poll = useCallback(async () => {
    if (!courseId) return;
    try {
      const list = await api<Message[]>(`/chats/course/${courseId}/messages`);
      setMessages(list);
    } catch (e: any) {
      setErr(e?.message || "Chat unavailable");
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
    poll();
    timer.current = setInterval(poll, 4000);
    return () => timer.current && clearInterval(timer.current);
  }, [poll, loadCourse]);

  async function send() {
    const t2 = text.trim();
    if (!t2) return;
    setText("");
    try {
      await api(`/chats/course/${courseId}/messages`, { method: "POST", body: { text: t2 } });
      await poll();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e: any) {
      setErr(e?.message || "Send failed");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable testID="chat-back" onPress={() => router.back()}>
          <Feather name="chevron-left" size={24} color={colors.gold400} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <Text style={styles.eyebrow}>STUDY GROUP</Text>
          <Text style={styles.title}>{course?.code || "Course"} · {course?.title || ""}</Text>
        </View>
      </View>

      {err && !messages.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{err}</Text>
          <Text style={styles.emptyBody}>Make sure you&apos;ve selected this course.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: space.md, paddingBottom: space.md }}
          ListEmptyComponent={
            <View style={styles.emptyInline}>
              <Text style={styles.emptyBody}>Be the first to say hi. This chat is auto-created for everyone taking {course?.code}.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.user_id === user?.id;
            return (
              <View style={[styles.bubbleWrap, mine ? styles.right : styles.left]}>
                {!mine && <Text style={styles.author}>{item.user_name}</Text>}
                <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.msg, mine && { color: colors.gold400 }]}>{item.text}</Text>
                </View>
                <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
            );
          }}
        />
      )}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.composer}>
          <TextInput
            testID="chat-input"
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable testID="chat-send" onPress={send} style={styles.sendBtn}>
            <Feather name="send" size={18} color={colors.navy900} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: space.md, backgroundColor: colors.navy900, flexDirection: "row", alignItems: "center" },
  eyebrow: { ...t.label, color: colors.gold400, fontFamily: fonts.mono, letterSpacing: 2, fontSize: 10 },
  title: { ...t.bodyBold, color: "#F7F3E7", marginTop: 2 },
  empty: { padding: space.lg },
  emptyInline: { padding: space.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.gold500 },
  emptyTitle: { ...t.h3, color: colors.navy900 },
  emptyBody: { ...t.body, color: colors.textMuted, marginTop: space.sm },
  bubbleWrap: { marginVertical: space.xs, maxWidth: "80%" },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end", alignItems: "flex-end" },
  author: { ...t.label, fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  bubble: { padding: space.sm, borderWidth: 1 },
  bubbleThem: { backgroundColor: colors.surface, borderColor: colors.border },
  bubbleMe: { backgroundColor: colors.navy900, borderColor: colors.navy900 },
  msg: { ...t.body, color: colors.text },
  time: { fontFamily: fonts.mono, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  composer: {
    flexDirection: "row",
    padding: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    backgroundColor: colors.surface,
    gap: space.sm,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.navy900,
    ...t.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold500,
    borderWidth: 1,
    borderColor: colors.navy900,
  },
});

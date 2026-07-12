import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { colors } from "@/src/theme";
import { getLastSeen, todayISO } from "@/src/utils/scriptureGate";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!user.onboarded) {
        router.replace("/onboarding");
        return;
      }
      const seen = await getLastSeen();
      if (seen !== todayISO()) {
        router.replace("/scripture-gate");
        return;
      }
      router.replace("/(tabs)");
    })();
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy900, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={colors.gold500} size="large" />
    </View>
  );
}

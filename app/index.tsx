import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  Modal,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/constants/colors";
import { getAllTests, type Test } from "@/lib/question-data";
import { getTestHistory, clearHistory, type TestResult } from "@/lib/storage";
import { useFocusEffect } from "expo-router";

type TabType = "tests" | "history";

function getSubjectFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("mega") || lower.includes("gt") || lower.includes("mock") || lower.includes("integrated") || lower.includes("fmg")) return "Grand Test";
  if (lower.includes("biochem") || lower.includes("fmt")) return "Biochem / FMT";
  if (lower.includes("micro") || lower.includes("anat")) return "Micro / Anatomy";
  if (lower.includes("psm") || lower.includes("derma") || lower.includes("anes")) return "PSM / Derma / Anes";
  if (lower.includes("ent") || lower.includes("ophthal") || lower.includes("psychi")) return "ENT / Ophthal / Psych";
  if (lower.includes("surg") || lower.includes("ortho") || lower.includes("radio")) return "Surgery / Ortho / Radio";
  if (lower.includes("obg") || lower.includes("pediatric")) return "Pediatrics / OBG";
  if (lower.includes("extra")) return "Extra Edge";
  return "General";
}

function getSubjectIcon(subject: string): string {
  switch (subject) {
    case "Grand Test": return "flask";
    case "Biochem / FMT": return "beaker";
    case "Micro / Anatomy": return "bug";
    case "PSM / Derma / Anes": return "medical";
    case "ENT / Ophthal / Psych": return "eye";
    case "Surgery / Ortho / Radio": return "cut";
    case "Pediatrics / OBG": return "heart";
    case "Extra Edge": return "star";
    default: return "book";
  }
}

function getSubjectColor(subject: string, accent: string): string {
  switch (subject) {
    case "Grand Test": return "#6366F1";
    case "Biochem / FMT": return "#EC4899";
    case "Micro / Anatomy": return "#F59E0B";
    case "PSM / Derma / Anes": return "#10B981";
    case "ENT / Ophthal / Psych": return "#8B5CF6";
    case "Surgery / Ortho / Radio": return "#EF4444";
    case "Pediatrics / OBG": return "#F97316";
    case "Extra Edge": return "#14B8A6";
    default: return accent;
  }
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>("tests");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [showModeModal, setShowModeModal] = useState(false);
  const [history, setHistory] = useState<TestResult[]>([]);

  const allTests = useMemo(() => getAllTests(), []);

  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return allTests;
    const q = searchQuery.toLowerCase();
    return allTests.filter(t => t.name.toLowerCase().includes(q));
  }, [allTests, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      getTestHistory().then(setHistory);
    }, [])
  );

  const handleTestPress = useCallback((test: Test) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTest(test);
    setShowModeModal(true);
  }, []);

  const startTest = useCallback((mode: "timed" | "practice") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowModeModal(false);
    if (selectedTest) {
      router.push({
        pathname: "/quiz",
        params: { testId: selectedTest.id, mode },
      });
    }
  }, [selectedTest]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      "Clear History",
      "This will delete all your past test records. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearHistory();
            setHistory([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, []);

  const renderTestItem = useCallback(({ item }: { item: Test }) => {
    const subject = getSubjectFromName(item.name);
    const subjectColor = getSubjectColor(subject, colors.accent);

    return (
      <Pressable
        onPress={() => handleTestPress(item)}
        style={({ pressed }) => [
          styles.testCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={[styles.testCardIcon, { backgroundColor: subjectColor + "18" }]}>
          <Ionicons name={getSubjectIcon(subject) as any} size={22} color={subjectColor} />
        </View>
        <View style={styles.testCardContent}>
          <Text style={[styles.testCardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.testCardMeta}>
            <View style={[styles.badge, { backgroundColor: subjectColor + "18" }]}>
              <Text style={[styles.badgeText, { color: subjectColor }]}>{subject}</Text>
            </View>
            <Text style={[styles.testCardSub, { color: colors.textSecondary }]}>
              {item.questionCount}Q  |  {item.duration}min
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
    );
  }, [colors, handleTestPress]);

  const renderHistoryItem = useCallback(({ item }: { item: TestResult }) => {
    const pct = item.percentage;
    const pctColor = pct >= 70 ? colors.correct : pct >= 40 ? colors.warning : colors.incorrect;

    return (
      <View style={[styles.historyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.historyHeader}>
          <View style={styles.historyTitleRow}>
            <View style={[styles.modeBadge, { backgroundColor: item.mode === "timed" ? "#6366F1" + "20" : colors.accentLight }]}>
              <Ionicons
                name={item.mode === "timed" ? "timer" : "school"}
                size={12}
                color={item.mode === "timed" ? "#6366F1" : colors.accent}
              />
              <Text style={[styles.modeText, { color: item.mode === "timed" ? "#6366F1" : colors.accent }]}>
                {item.mode === "timed" ? "Timed" : "Practice"}
              </Text>
            </View>
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <Text style={[styles.historyName, { color: colors.text }]} numberOfLines={1}>
            {item.testName}
          </Text>
        </View>
        <View style={styles.historyStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: pctColor, fontFamily: "Inter_700Bold" }]}>{Math.round(pct)}%</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Score</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.correct }]}>{item.correct}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correct</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.incorrect }]}>{item.incorrect}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Wrong</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>{item.unanswered}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Skip</Text>
          </View>
        </View>
      </View>
    );
  }, [colors]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 12, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>NEET PG Prep</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {allTests.length} tests  |  {allTests.reduce((a, t) => a + t.questionCount, 0).toLocaleString()} questions
            </Text>
          </View>
          <View style={[styles.headerIconBg, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons name="stethoscope" size={24} color={colors.accent} />
          </View>
        </View>

        <View style={styles.tabBar}>
          {(["tests", "history"] as TabType[]).map(tab => (
            <Pressable
              key={tab}
              onPress={() => { setActiveTab(tab); Haptics.selectionAsync(); }}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
              ]}
            >
              <Ionicons
                name={tab === "tests" ? "library" : "time"}
                size={18}
                color={activeTab === tab ? colors.accent : colors.textSecondary}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? colors.accent : colors.textSecondary },
                activeTab === tab && { fontFamily: "Inter_600SemiBold" },
              ]}>
                {tab === "tests" ? "Tests" : "History"}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeTab === "tests" && (
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search tests..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {activeTab === "tests" ? (
        <FlatList
          data={filteredTests}
          keyExtractor={item => item.id}
          renderItem={renderTestItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: (Platform.OS === "web" ? webBottomInset : insets.bottom) + 20 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filteredTests.length > 0}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No tests found</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={item => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: (Platform.OS === "web" ? webBottomInset : insets.bottom) + 20 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={history.length > 0}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No test history yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Complete a test to see your results here</Text>
            </View>
          }
          ListHeaderComponent={
            history.length > 0 ? (
              <Pressable
                onPress={handleClearHistory}
                style={[styles.clearBtn, { borderColor: colors.incorrect + "40" }]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.incorrect} />
                <Text style={[styles.clearBtnText, { color: colors.incorrect }]}>Clear History</Text>
              </Pressable>
            ) : null
          }
        />
      )}

      <Modal visible={showModeModal} transparent animationType="fade" onRequestClose={() => setShowModeModal(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowModeModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.modalHandle}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Mode</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
              {selectedTest?.name}
            </Text>
            <Text style={[styles.modalMeta, { color: colors.textSecondary }]}>
              {selectedTest?.questionCount} questions  |  {selectedTest?.duration} minutes
            </Text>

            <Pressable
              onPress={() => startTest("timed")}
              style={({ pressed }) => [
                styles.modeButton,
                { backgroundColor: "#6366F1", opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={styles.modeButtonInner}>
                <View style={styles.modeButtonIcon}>
                  <Ionicons name="timer" size={28} color="#FFF" />
                </View>
                <View style={styles.modeButtonText}>
                  <Text style={styles.modeButtonTitle}>Timed Mode</Text>
                  <Text style={styles.modeButtonDesc}>Exam simulation with countdown timer. Results at end.</Text>
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={() => startTest("practice")}
              style={({ pressed }) => [
                styles.modeButton,
                { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={styles.modeButtonInner}>
                <View style={styles.modeButtonIcon}>
                  <Ionicons name="school" size={28} color="#FFF" />
                </View>
                <View style={styles.modeButtonText}>
                  <Text style={styles.modeButtonTitle}>Practice Mode</Text>
                  <Text style={styles.modeButtonDesc}>Instant answer feedback. No timer. Learn at your pace.</Text>
                </View>
              </View>
            </Pressable>

            <Pressable onPress={() => setShowModeModal(false)} style={[styles.cancelButton, { borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: 1, paddingHorizontal: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  tabBar: { flexDirection: "row", gap: 24, marginBottom: 0 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 4 },
  tabText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  searchBar: { flexDirection: "row", alignItems: "center", borderRadius: 10, paddingHorizontal: 12, height: 40, marginTop: 10, marginBottom: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, fontFamily: "Inter_400Regular" },
  listContent: { padding: 16, gap: 10 },
  testCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  testCardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  testCardContent: { flex: 1, gap: 6 },
  testCardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  testCardMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  testCardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyCard: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 2 },
  historyHeader: { marginBottom: 12 },
  historyTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  modeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  historyDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  historyStats: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 30 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  clearBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-end", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  clearBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { alignItems: "center", marginBottom: 16 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 2 },
  modalMeta: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 20 },
  modeButton: { borderRadius: 16, padding: 16, marginBottom: 12 },
  modeButtonInner: { flexDirection: "row", alignItems: "center", gap: 14 },
  modeButtonIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  modeButtonText: { flex: 1 },
  modeButtonTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF", marginBottom: 2 },
  modeButtonDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", lineHeight: 16 },
  cancelButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center", borderWidth: 1, marginTop: 4 },
  cancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

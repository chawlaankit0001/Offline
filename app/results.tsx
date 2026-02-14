import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  FlatList,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";
import { getTestById, type Question } from "@/lib/question-data";
import { type TestResult } from "@/lib/storage";

export default function ResultsScreen() {
  const { testId, resultData, answersData } = useLocalSearchParams<{
    testId: string;
    resultData: string;
    answersData: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const result: TestResult = useMemo(() => JSON.parse(resultData || "{}"), [resultData]);
  const userAnswers: (number | null)[] = useMemo(() => JSON.parse(answersData || "[]"), [answersData]);
  const test = useMemo(() => getTestById(testId || ""), [testId]);
  const questions = test?.questions || [];

  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "correct" | "incorrect" | "unanswered">("all");

  const filteredIndices = useMemo(() => {
    return questions.map((_, i) => i).filter(i => {
      const ans = userAnswers[i];
      if (filter === "all") return true;
      if (filter === "correct") return ans !== null && questions[i].options[ans]?.correct;
      if (filter === "incorrect") return ans !== null && !questions[i].options[ans]?.correct;
      if (filter === "unanswered") return ans === null;
      return true;
    });
  }, [questions, userAnswers, filter]);

  const pct = result.percentage || 0;
  const scoreColor = pct >= 70 ? colors.correct : pct >= 40 ? colors.warning : colors.incorrect;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const topPad = Platform.OS === "web" ? webTopInset : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottomInset : insets.bottom;

  const renderReviewQuestion = () => {
    if (reviewIndex === null) return null;
    const q = questions[reviewIndex];
    const userAns = userAnswers[reviewIndex];

    return (
      <Modal visible={reviewIndex !== null} transparent animationType="slide" onRequestClose={() => setReviewIndex(null)}>
        <View style={[styles.reviewOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.reviewHeader, { paddingTop: topPad + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setReviewIndex(null)} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.reviewTitle, { color: colors.text }]}>
              Question {reviewIndex + 1}/{questions.length}
            </Text>
            <View style={styles.reviewNavButtons}>
              <Pressable
                onPress={() => {
                  const currentFilterIdx = filteredIndices.indexOf(reviewIndex);
                  if (currentFilterIdx > 0) setReviewIndex(filteredIndices[currentFilterIdx - 1]);
                }}
                disabled={filteredIndices.indexOf(reviewIndex) <= 0}
                style={[styles.reviewNavBtn, { backgroundColor: colors.surfaceSecondary, opacity: filteredIndices.indexOf(reviewIndex) <= 0 ? 0.4 : 1 }]}
              >
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  const currentFilterIdx = filteredIndices.indexOf(reviewIndex);
                  if (currentFilterIdx < filteredIndices.length - 1) setReviewIndex(filteredIndices[currentFilterIdx + 1]);
                }}
                disabled={filteredIndices.indexOf(reviewIndex) >= filteredIndices.length - 1}
                style={[styles.reviewNavBtn, { backgroundColor: colors.accent, opacity: filteredIndices.indexOf(reviewIndex) >= filteredIndices.length - 1 ? 0.4 : 1 }]}
              >
                <Ionicons name="chevron-forward" size={18} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={[styles.reviewScrollContent, { paddingBottom: bottomPad + 20 }]} showsVerticalScrollIndicator={false}>
            <Text style={[styles.reviewQuestionText, { color: colors.text }]}>{q.text}</Text>

            <View style={styles.reviewOptions}>
              {q.options.map((opt, idx) => {
                const isCorrect = opt.correct;
                const isUserAnswer = userAns === idx;
                let bg = colors.surface;
                let border = colors.border;
                let labelBg = colors.surfaceSecondary;
                let labelColor = colors.text;

                if (isCorrect) {
                  bg = colors.correctLight;
                  border = colors.correct;
                  labelBg = colors.correct;
                  labelColor = "#FFF";
                } else if (isUserAnswer) {
                  bg = colors.incorrectLight;
                  border = colors.incorrect;
                  labelBg = colors.incorrect;
                  labelColor = "#FFF";
                }

                return (
                  <View key={idx} style={[styles.reviewOption, { backgroundColor: bg, borderColor: border }]}>
                    <View style={[styles.reviewOptionLabel, { backgroundColor: labelBg }]}>
                      <Text style={[styles.reviewOptionLabelText, { color: labelColor }]}>{opt.label}</Text>
                    </View>
                    <Text style={[styles.reviewOptionText, { color: colors.text }]}>{opt.text}</Text>
                    {isCorrect && <Ionicons name="checkmark-circle" size={20} color={colors.correct} />}
                    {isUserAnswer && !isCorrect && <Ionicons name="close-circle" size={20} color={colors.incorrect} />}
                  </View>
                );
              })}
            </View>

            {q.explanation ? (
              <View style={[styles.reviewExplanation, { backgroundColor: colors.accentLight, borderColor: colors.accent + "40" }]}>
                <View style={styles.explanationHeader}>
                  <Ionicons name="bulb" size={18} color={colors.accent} />
                  <Text style={[styles.explanationTitle, { color: colors.accent }]}>Explanation</Text>
                </View>
                <Text style={[styles.explanationText, { color: colors.text }]}>{q.explanation}</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 16, paddingBottom: bottomPad + 20 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(300)}>
          <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + "18" }]}>
              <Text style={[styles.scoreValue, { color: scoreColor }]}>{Math.round(pct)}%</Text>
              <Text style={[styles.scoreLabel, { color: scoreColor }]}>Score</Text>
            </View>

            <Text style={[styles.testName, { color: colors.text }]} numberOfLines={2}>{result.testName}</Text>
            <Text style={[styles.testDate, { color: colors.textSecondary }]}>
              {new Date(result.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {result.timeSpent > 0 ? `  |  ${formatTime(result.timeSpent)}` : ""}
            </Text>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.correctLight }]}>
                <Ionicons name="checkmark-circle" size={22} color={colors.correct} />
                <Text style={[styles.statBoxValue, { color: colors.correct }]}>{result.correct}</Text>
                <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Correct</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.incorrectLight }]}>
                <Ionicons name="close-circle" size={22} color={colors.incorrect} />
                <Text style={[styles.statBoxValue, { color: colors.incorrect }]}>{result.incorrect}</Text>
                <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Incorrect</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="remove-circle" size={22} color={colors.textSecondary} />
                <Text style={[styles.statBoxValue, { color: colors.textSecondary }]}>{result.unanswered}</Text>
                <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Skipped</Text>
              </View>
            </View>

            <View style={[styles.markingScheme, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.markingTitle, { color: colors.text }]}>Marks: {result.score}/{result.total}</Text>
              <Text style={[styles.markingDetail, { color: colors.textSecondary }]}>+4 correct  |  -1 incorrect  |  0 skipped</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(300)}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Review Questions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {(["all", "correct", "incorrect", "unanswered"] as const).map(f => (
              <Pressable
                key={f}
                onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filter === f ? colors.accent : colors.surface,
                    borderColor: filter === f ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filter === f ? "#FFF" : colors.text },
                ]}>
                  {f === "all" ? `All (${questions.length})` :
                    f === "correct" ? `Correct (${result.correct})` :
                    f === "incorrect" ? `Incorrect (${result.incorrect})` :
                    `Skipped (${result.unanswered})`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.questionGrid}>
            {filteredIndices.map(i => {
              const ans = userAnswers[i];
              const isCorrect = ans !== null && questions[i].options[ans]?.correct;
              const isIncorrect = ans !== null && !questions[i].options[ans]?.correct;

              let bg = colors.surfaceSecondary;
              let textC = colors.text;
              if (isCorrect) { bg = colors.correct; textC = "#FFF"; }
              if (isIncorrect) { bg = colors.incorrect; textC = "#FFF"; }

              return (
                <Pressable
                  key={i}
                  onPress={() => { setReviewIndex(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.questionGridItem, { backgroundColor: bg }]}
                >
                  <Text style={[styles.questionGridText, { color: textC }]}>{i + 1}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace("/"); }}
          style={[styles.homeButton, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="home" size={20} color="#FFF" />
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </Pressable>
      </ScrollView>

      {renderReviewQuestion()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  scoreCard: { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: "center", marginBottom: 24 },
  scoreBadge: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  scoreValue: { fontSize: 32, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: -2 },
  testName: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  testDate: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 20 },
  statsGrid: { flexDirection: "row", gap: 10, marginBottom: 16, width: "100%" },
  statBox: { flex: 1, padding: 14, borderRadius: 14, alignItems: "center", gap: 4 },
  statBoxValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statBoxLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  markingScheme: { width: "100%", padding: 12, borderRadius: 10, alignItems: "center" },
  markingTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  markingDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  filterRow: { gap: 8, marginBottom: 16, paddingRight: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  questionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  questionGridItem: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  questionGridText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  homeButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, paddingVertical: 16, borderRadius: 14 },
  homeButtonText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  reviewOverlay: { flex: 1 },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  reviewTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  reviewNavButtons: { flexDirection: "row", gap: 8 },
  reviewNavBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  reviewScrollContent: { padding: 20 },
  reviewQuestionText: { fontSize: 16, fontFamily: "Inter_500Medium", lineHeight: 24, marginBottom: 20 },
  reviewOptions: { gap: 10, marginBottom: 20 },
  reviewOption: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  reviewOptionLabel: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  reviewOptionLabelText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  reviewOptionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  reviewExplanation: { padding: 16, borderRadius: 14, borderWidth: 1 },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  explanationTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  explanationText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});

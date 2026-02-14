import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  Modal,
  FlatList,
  BackHandler,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useThemeColors } from "@/constants/colors";
import { getTestById, type Question } from "@/lib/question-data";
import { saveTestResult, type TestResult } from "@/lib/storage";

export default function QuizScreen() {
  const { testId, mode } = useLocalSearchParams<{ testId: string; mode: "timed" | "practice" }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const test = useMemo(() => getTestById(testId || ""), [testId]);
  const questions = test?.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => new Array(questions.length).fill(null));
  const [markedForReview, setMarkedForReview] = useState<boolean[]>(() => new Array(questions.length).fill(false));
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState((test?.duration || 210) * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(Date.now());

  const isTimed = mode === "timed";
  const currentQ = questions[currentIndex];

  useEffect(() => {
    if (!isTimed || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimed, submitted]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      handleGoBack();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const handleGoBack = useCallback(() => {
    Alert.alert(
      "Leave Test?",
      "Your progress will be lost. Are you sure?",
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            router.back();
          },
        },
      ]
    );
  }, []);

  const selectAnswer = useCallback((optionIndex: number) => {
    if (isTimed && submitted) return;
    if (!isTimed && answers[currentIndex] !== null) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);

    if (!isTimed) {
      setShowExplanation(true);
    }
  }, [currentIndex, answers, isTimed, submitted]);

  const goToQuestion = useCallback((index: number) => {
    setCurrentIndex(index);
    setShowNavPanel(false);
    setShowExplanation(false);
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowExplanation(false);
    }
  }, [currentIndex, questions.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowExplanation(false);
    }
  }, [currentIndex]);

  const toggleMark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMarked = [...markedForReview];
    newMarked[currentIndex] = !newMarked[currentIndex];
    setMarkedForReview(newMarked);
  }, [currentIndex, markedForReview]);

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = answers.filter(a => a === null).length;
      const msg = unanswered > 0
        ? `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?`
        : "Submit your test?";

      Alert.alert("Submit Test", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: () => finalizeSubmit() },
      ]);
    } else {
      finalizeSubmit();
    }
  }, [answers]);

  const finalizeSubmit = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    questions.forEach((q, i) => {
      if (answers[i] === null) {
        unanswered++;
      } else if (q.options[answers[i]!]?.correct) {
        correct++;
      } else {
        incorrect++;
      }
    });

    const total = questions.length;
    const score = correct * 4 - incorrect;
    const percentage = total > 0 ? (correct / total) * 100 : 0;
    const timeSpent = (test?.duration || 210) * 60 - timeRemaining;

    const result: TestResult = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      testId: testId || "",
      testName: test?.name || "",
      mode: mode || "timed",
      score,
      total: total * 4,
      percentage,
      correct,
      incorrect,
      unanswered,
      date: new Date().toISOString(),
      timeSpent,
    };

    await saveTestResult(result);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    router.replace({
      pathname: "/results",
      params: {
        testId: testId || "",
        resultData: JSON.stringify(result),
        answersData: JSON.stringify(answers),
      },
    });
  }, [answers, questions, test, timeRemaining, testId, mode]);

  const answeredCount = answers.filter(a => a !== null).length;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const topPad = Platform.OS === "web" ? webTopInset : insets.top;
  const bottomPad = Platform.OS === "web" ? webBottomInset : insets.bottom;

  if (!test || questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 20 }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Test not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.accent }]}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const renderQuestionNavItem = ({ item, index }: { item: Question; index: number }) => {
    const isAnswered = answers[index] !== null;
    const isMarked = markedForReview[index];
    const isCurrent = index === currentIndex;

    return (
      <Pressable
        onPress={() => goToQuestion(index)}
        style={[
          styles.navGridItem,
          {
            backgroundColor: isCurrent ? colors.accent : isAnswered ? colors.correct : colors.surfaceSecondary,
            borderWidth: isMarked ? 2 : 0,
            borderColor: isMarked ? colors.warning : "transparent",
          },
        ]}
      >
        <Text style={[
          styles.navGridText,
          { color: isCurrent || isAnswered ? "#FFF" : colors.text },
        ]}>
          {index + 1}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.topBarRow}>
          <Pressable onPress={handleGoBack} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <Text style={[styles.questionCounter, { color: colors.text }]}>
              {currentIndex + 1}/{questions.length}
            </Text>
            {isTimed && (
              <View style={[styles.timerBadge, { backgroundColor: timeRemaining < 300 ? colors.incorrectLight : colors.accentLight }]}>
                <Ionicons name="timer-outline" size={14} color={timeRemaining < 300 ? colors.incorrect : colors.accent} />
                <Text style={[styles.timerText, { color: timeRemaining < 300 ? colors.incorrect : colors.accent }]}>
                  {formatTime(timeRemaining)}
                </Text>
              </View>
            )}
            {!isTimed && (
              <View style={[styles.timerBadge, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="school-outline" size={14} color={colors.accent} />
                <Text style={[styles.timerText, { color: colors.accent }]}>Practice</Text>
              </View>
            )}
          </View>
          <Pressable onPress={() => setShowNavPanel(true)} hitSlop={10}>
            <Ionicons name="grid-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSecondary }]}>
          <Animated.View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.accent }]} />
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            Answered: {answeredCount}/{questions.length}
          </Text>
          {markedForReview[currentIndex] && (
            <View style={[styles.markedBadge, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="flag" size={12} color={colors.warning} />
              <Text style={[styles.markedBadgeText, { color: colors.warning }]}>Marked</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={[styles.questionText, { color: colors.text }]}>
            {currentQ.text}
          </Text>
        </Animated.View>

        <View style={styles.optionsContainer}>
          {currentQ.options.map((option, idx) => {
            const isSelected = answers[currentIndex] === idx;
            const isPracticeRevealed = !isTimed && answers[currentIndex] !== null;
            const isCorrect = option.correct;

            let optionBg = colors.surface;
            let optionBorder = colors.border;
            let labelBg = colors.surfaceSecondary;
            let labelColor = colors.text;
            let textColor = colors.text;

            if (isPracticeRevealed) {
              if (isCorrect) {
                optionBg = colors.correctLight;
                optionBorder = colors.correct;
                labelBg = colors.correct;
                labelColor = "#FFF";
                textColor = colors.text;
              } else if (isSelected && !isCorrect) {
                optionBg = colors.incorrectLight;
                optionBorder = colors.incorrect;
                labelBg = colors.incorrect;
                labelColor = "#FFF";
                textColor = colors.text;
              }
            } else if (isSelected && isTimed) {
              optionBg = colors.accentLight;
              optionBorder = colors.accent;
              labelBg = colors.accent;
              labelColor = "#FFF";
            }

            return (
              <Animated.View key={idx} entering={FadeInDown.delay(idx * 50).duration(200)}>
                <Pressable
                  onPress={() => selectAnswer(idx)}
                  disabled={isPracticeRevealed}
                  style={({ pressed }) => [
                    styles.optionButton,
                    {
                      backgroundColor: optionBg,
                      borderColor: optionBorder,
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <View style={[styles.optionLabel, { backgroundColor: labelBg }]}>
                    <Text style={[styles.optionLabelText, { color: labelColor }]}>{option.label}</Text>
                  </View>
                  <Text style={[styles.optionText, { color: textColor }]}>{option.text}</Text>
                  {isPracticeRevealed && isCorrect && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.correct} style={styles.optionIcon} />
                  )}
                  {isPracticeRevealed && isSelected && !isCorrect && (
                    <Ionicons name="close-circle" size={22} color={colors.incorrect} style={styles.optionIcon} />
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {!isTimed && answers[currentIndex] !== null && currentQ.explanation && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.explanationBox, { backgroundColor: colors.accentLight, borderColor: colors.accent + "40" }]}>
            <View style={styles.explanationHeader}>
              <Ionicons name="bulb" size={18} color={colors.accent} />
              <Text style={[styles.explanationTitle, { color: colors.accent }]}>Explanation</Text>
            </View>
            <Text style={[styles.explanationText, { color: colors.text }]}>
              {currentQ.explanation}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: bottomPad + 8, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.bottomActions}>
          <Pressable
            onPress={goPrev}
            disabled={currentIndex === 0}
            style={[styles.navButton, { backgroundColor: colors.surfaceSecondary, opacity: currentIndex === 0 ? 0.4 : 1 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={toggleMark}
            style={[
              styles.markButton,
              {
                backgroundColor: markedForReview[currentIndex] ? colors.warningLight : colors.surfaceSecondary,
                borderColor: markedForReview[currentIndex] ? colors.warning : "transparent",
                borderWidth: markedForReview[currentIndex] ? 1 : 0,
              },
            ]}
          >
            <Ionicons
              name={markedForReview[currentIndex] ? "flag" : "flag-outline"}
              size={18}
              color={markedForReview[currentIndex] ? colors.warning : colors.textSecondary}
            />
          </Pressable>

          {isTimed && (
            <Pressable
              onPress={() => handleSubmit()}
              style={[styles.submitButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.submitText}>Submit</Text>
            </Pressable>
          )}

          {!isTimed && (
            <Pressable
              onPress={() => {
                if (timerRef.current) clearInterval(timerRef.current);
                router.back();
              }}
              style={[styles.submitButton, { backgroundColor: colors.textSecondary }]}
            >
              <Text style={styles.submitText}>End</Text>
            </Pressable>
          )}

          <Pressable
            onPress={goNext}
            disabled={currentIndex === questions.length - 1}
            style={[styles.navButton, { backgroundColor: colors.accent, opacity: currentIndex === questions.length - 1 ? 0.4 : 1 }]}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFF" />
          </Pressable>
        </View>
      </View>

      <Modal visible={showNavPanel} transparent animationType="fade" onRequestClose={() => setShowNavPanel(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowNavPanel(false)}>
          <Pressable style={[styles.navPanelContent, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.navPanelHeader}>
              <Text style={[styles.navPanelTitle, { color: colors.text }]}>Questions</Text>
              <Pressable onPress={() => setShowNavPanel(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.navLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.correct }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.surfaceSecondary }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Not Answered</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.warning, borderWidth: 2, borderColor: colors.warning }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>Marked</Text>
              </View>
            </View>

            <FlatList
              data={questions}
              keyExtractor={(_, i) => i.toString()}
              numColumns={6}
              renderItem={renderQuestionNavItem}
              contentContainerStyle={styles.navGrid}
              columnWrapperStyle={styles.navGridRow}
              showsVerticalScrollIndicator={false}
              scrollEnabled={questions.length > 30}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 8 },
  topBarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  topBarCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  questionCounter: { fontSize: 16, fontFamily: "Inter_700Bold" },
  timerBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  progressTrack: { height: 3, borderRadius: 2, marginBottom: 6 },
  progressFill: { height: 3, borderRadius: 2 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  markedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  markedBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 20 },
  questionText: { fontSize: 16, fontFamily: "Inter_500Medium", lineHeight: 24, marginBottom: 20 },
  optionsContainer: { gap: 10 },
  optionButton: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1.5, gap: 12 },
  optionLabel: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  optionLabelText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  optionIcon: { marginLeft: 4 },
  explanationBox: { marginTop: 20, padding: 16, borderRadius: 14, borderWidth: 1 },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  explanationTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  explanationText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  bottomBar: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 8 },
  bottomActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  navButton: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  markButton: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  submitButton: { flex: 1, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  submitText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
  backBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, alignSelf: "center" },
  backBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorText: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 40 },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  navPanelContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  navPanelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  navPanelTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  navLegend: { flexDirection: "row", gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  navGrid: { paddingBottom: 20 },
  navGridRow: { gap: 8, marginBottom: 8, justifyContent: "flex-start" },
  navGridItem: { width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  navGridText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

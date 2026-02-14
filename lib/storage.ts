import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@neetpg_history';

export interface TestResult {
  id: string;
  testId: string;
  testName: string;
  mode: 'timed' | 'practice';
  score: number;
  total: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  date: string;
  timeSpent: number;
}

export async function saveTestResult(result: TestResult): Promise<void> {
  try {
    const existing = await getTestHistory();
    existing.unshift(result);
    if (existing.length > 100) existing.length = 100;
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save test result:', e);
  }
}

export async function getTestHistory(): Promise<TestResult[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load test history:', e);
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
}

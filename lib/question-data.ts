import questionsData from '@/data/questions.json';

export interface QuestionOption {
  label: string;
  text: string;
  correct: boolean;
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
}

export interface Test {
  id: string;
  name: string;
  questionCount: number;
  duration: number;
  questions: Question[];
}

const allTests: Test[] = questionsData as Test[];

export function getAllTests(): Test[] {
  return allTests.map(t => ({
    ...t,
    questions: [],
  }));
}

export function getTestById(id: string): Test | undefined {
  return allTests.find(t => t.id === id);
}

export function searchTests(query: string): Test[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllTests();
  return allTests
    .filter(t => t.name.toLowerCase().includes(q))
    .map(t => ({ ...t, questions: [] }));
}

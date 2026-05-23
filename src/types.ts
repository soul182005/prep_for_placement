/**
 * Shared Type Definitions for Smart Placement Preparation Platform
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  fileUrl: string;
  parsedJson?: string | null; // Contains skills list, years experience, etc.
  aiFeedback?: string | null; // Detailed strengths, weaknesses, suggestions
  updatedAt: string;
}

export interface AptitudeQuestion {
  id: string;
  category: "quant" | "logical" | "verbal";
  difficulty: "easy" | "medium" | "hard";
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

export interface AptitudeAttempt {
  id: string;
  userId: string;
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeTaken: number;
  attemptedAt: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  description: string;
  starterCode: string; // JSON string of languages -> code template map
  testCases: string;   // JSON string of TestCase[]
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface CodingSession {
  id: string;
  userId: string;
  problemId: string;
  code: string;
  language: string;
  status: "attempted" | "solved" | "given_up";
  aiFeedback?: string | null;
  solvedAt?: string | null;
  createdAt: string;
}

export interface InterviewMessage {
  role: "ai" | "user";
  content: string;
}

export interface InterviewSession {
  id: string;
  userId: string;
  role: string;
  mode: "technical" | "hr" | "mixed";
  transcript: string; // JSON string of InterviewMessage[]
  aiScore?: number | null;
  aiFeedback?: string | null;
  duration?: number | null;
  createdAt: string;
}

export interface SkillScore {
  id: string;
  userId: string;
  skill: string;
  score: number;
  updatedAt: string;
}

export interface DashboardStats {
  skillScores: SkillScore[];
  recentActivity: Array<{
    id: string;
    type: "resume" | "aptitude" | "coding" | "interview";
    title: string;
    subtitle: string;
    scoreString?: string;
    timestamp: string;
  }>;
  streak: number;
  totalEvaluations?: number;
  performanceTimeline?: Array<{ label: string; score: number }>;
}

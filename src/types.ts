export type QuestionCategory = 
  | 'Algorithms' 
  | 'Data Structures' 
  | 'System Design' 
  | 'Behavioral' 
  | 'Databases'
  | 'Pharmacy & Healthcare'
  | 'Information & Technology'
  | 'Banking & Finance';

export type QuestionType = 'coding' | 'conceptual';

export type UserRole = 'admin' | 'candidate';

export interface User {
  id: string;
  email: string;
  name: string;
  role?: UserRole;
  registeredAt: string;
}

export interface QuestionTestCase {
  name?: string;
  functionName?: string;
  args: any[];
  expected: any;
}

export interface Question {
  id: string;
  title: string;
  category: QuestionCategory;
  type: QuestionType;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  initialCode?: string;
  solutionTemplate?: string;
  expectedOutcomes?: string[];
  keywords?: string[];
  isCustom?: boolean;
  testCases?: QuestionTestCase[];
  sqlSetup?: string;
}

export interface CodeReviewSuggestion {
  line?: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion?: string;
}

export interface EvaluationResult {
  score: number;
  summary: string;
  correctness: string;
  strengths: string[];
  weaknesses: string[];
  modelAnswer: string;
  followUpQuestion?: string;
  codeReview?: {
    suggestions: CodeReviewSuggestion[];
  };
}

export interface Submission {
  id: string;
  userId?: string;
  questionId: string;
  questionTitle: string;
  category: QuestionCategory;
  type: QuestionType;
  answerText: string;
  codeLanguage?: string;
  durationSeconds?: number;
  hintsUsed?: number;
  timestamp: string;
  evaluation: EvaluationResult;
}

export interface FollowUpMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  timestamp: string;
}

export interface SqlExecutionResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executedStatements: number;
  error?: string;
}

export interface MockExamConfig {
  id: string;
  title: string;
  durationMinutes: number;
  questions: Question[];
}

export interface Feedback {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  rating: number;
  category: 'Bug Report' | 'Feature Request' | 'Question Content Feedback' | 'General Praise' | 'Other';
  message: string;
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  action: string;
  timestamp: string;
  details: string;
}

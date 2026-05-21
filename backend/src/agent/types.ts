export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }
}

export interface ToolResult {
  toolName: string
  result: unknown
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export type ExamDomain =
  | 'Cloud Concepts'
  | 'Security & Compliance'
  | 'Cloud Technology & Services'
  | 'Billing, Pricing & Support'

export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface TopicProgressData {
  topic: string
  domain: ExamDomain
  correctAnswers: number
  totalAnswers: number
  weakScore: number
  lastStudied: Date
}

export interface WeakTopicsResult {
  roadmapWeek: number
  examDate: Date | null | undefined
  topicProgress: TopicProgressData[]
  weakTopics: string[]
  mediumTopics: string[]
  strongTopics: string[]
  recommendation: string
}

export interface RoadmapResult {
  daysUntilExam: number
  totalWeeks: number
  domains: {
    name: ExamDomain
    weight: number
    topics: string[]
  }[]
  knowledgeLevel: KnowledgeLevel
  weakTopics: string[]
  recommendedDailyStudyHours: number
  startingTopic: string
  startingDomain: ExamDomain
}

export interface QuizResult {
  topic: string
  difficulty: Difficulty
  questionCount: number
  roadmapWeek: string
  completedTopics: string[]
  instruction: string
}

export interface EvaluateAnswerResult {
  isCorrect: boolean
  topic: string
  instruction: string
}

export interface TrackProgressResult {
  progress: TopicProgressData
  message: string
}

export interface UserContext {
  userId: string
  email: string
  roadmapWeek: number
  knowledgeLevel: KnowledgeLevel
  examDate: Date | null
}

export interface DomainConfig {
  name: ExamDomain
  weight: number
  questionCount: number
  topics: string[]
  instruction?: string
}

export interface FinalExamResult {
  ready: boolean
  message?: string
  pendingTopics?: string[]
  completedCount?: number
  totalCount?: number
  totalQuestions?: number
  timeLimit?: number
  domains?: DomainConfig[]
  previousAttempts?: number
  bestScore?: number | null
  instruction?: string
}

export interface ExamResultData {
  id: string
  userId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  domainScores: Record<ExamDomain, number>
  completedAt: Date
}

// Progreso detallado por dificultad
export interface TopicProgressDetailed {
  topic: string
  domain: ExamDomain
  weakScore: number
  easyCompleted: boolean
  mediumCompleted: boolean
  hardCompleted: boolean
  topicCompleted: boolean
  recommendedDifficulty: Difficulty
}

export interface TrackProgressResult {
  progress: TopicProgressData
  topicCompleted: boolean
  nextRecommendedDifficulty: Difficulty | null
  message: string
}

export interface WeakTopicsResult {
  roadmapWeek: number
  knowledgeLevel: KnowledgeLevel
  examDate: Date | null | undefined
  completedTopics: string[]
  inProgressTopics: TopicProgressDetailed[]
  notStartedTopics: string[]
  recommendation: string
}
export type ScreenId =
  | 'intro'
  | 'questions'
  | 'confirmation'
  | 'admin'
  | 'analytics'
  | 'export';

export type DomainChannel = 'ecommerce' | 'cskh' | 'marketing' | 'quality';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export type ActionPriority = 'high' | 'medium' | 'low';

export interface AspectScores {
  speed: number;
  quality: number;
  experience: number;
  staff: number;
}

export interface AIResponseAnalysis {
  sentiment: SentimentType;
  sentimentScore: number;
  themes: string[];
  summary: string;
  actionPriority: ActionPriority;
  suggestedTeam: string;
  analyzedAt: string;
}

export interface SurveyResponse {
  id: string;
  createdAt: string;
  completionSeconds: number;
  channel: DomainChannel;
  csat: number;
  nps: number;
  aspectScores: AspectScores;
  positiveFeedback: string;
  improvementFeedback: string;
  customerSegment: string;
  aiAnalysis?: AIResponseAnalysis;
}

export interface RecurringTheme {
  theme: string;
  count: number;
  sentiment: SentimentType;
  excerpt: string;
  department: string;
}

export interface DepartmentRecommendation {
  department: string;
  priority: ActionPriority;
  action: string;
}

export interface AggregateAIReport {
  generatedAt: string;
  sampleSize: number;
  channelFilter: string;
  executiveSummary: string;
  recurringThemes: RecurringTheme[];
  recommendations: DepartmentRecommendation[];
}

export interface SurveyCampaignConfig {
  id: string;
  title: string;
  estimatedMinutes: number;
  isActive: boolean;
  welcomeNote: string;
  updatedAt: string;
}

export interface SurveyDraftInput {
  channel: DomainChannel;
  customerSegment: string;
  csat: number;
  nps: number;
  aspectScores: AspectScores;
  positiveFeedback: string;
  improvementFeedback: string;
  completionSeconds: number;
}

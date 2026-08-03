// Survey Monkey-style questionnaire system types

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  order: number;
  options?: QuestionOption[];
  validation?: QuestionValidation;
  logic?: QuestionLogic;
  settings?: QuestionSettings;
}

export type QuestionType = 
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'text'
  | 'email'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'rating'
  | 'scale'
  | 'ranking'
  | 'matrix'
  | 'file_upload'
  | 'phone'
  | 'website'
  | 'slider'
  | 'image_choice'
  | 'contact_info'
  | 'address'
  | 'net_promoter_score'
  | 'likert_scale';

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
  weight?: number; // For weighted scoring
  goToQuestion?: string; // For skip logic
  goToPage?: string;
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  minValue?: number;
  maxValue?: number;
  pattern?: string;
  customMessage?: string;
  mustSelectMin?: number;
  mustSelectMax?: number;
}

export interface QuestionLogic {
  showIf?: LogicCondition[];
  hideIf?: LogicCondition[];
  skipTo?: string; // Question or page ID
  endSurvey?: boolean;
}

export interface LogicCondition {
  questionId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_answered' | 'is_not_answered';
  value?: string | number | string[];
}

export interface QuestionSettings {
  randomizeOptions?: boolean;
  allowOther?: boolean;
  otherText?: string;
  columns?: number;
  showLabels?: boolean;
  startValue?: number;
  endValue?: number;
  stepValue?: number;
  scaleLabels?: string[];
  matrixRows?: string[];
  matrixColumns?: string[];
  allowMultipleFiles?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
}

export interface SurveyPage {
  id: string;
  title?: string;
  description?: string;
  order: number;
  questions: SurveyQuestion[];
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  welcomeMessage?: string;
  thankYouMessage?: string;
  status: 'draft' | 'active' | 'paused' | 'closed' | 'archived';
  pages: SurveyPage[];
  settings: SurveySettings;
  branding?: SurveyBranding;
  analytics?: SurveyAnalytics;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  closedAt?: string;
}

export interface SurveySettings {
  collectEmail?: boolean;
  requireEmail?: boolean;
  allowAnonymous?: boolean;
  oneResponsePerDevice?: boolean;
  oneResponsePerEmail?: boolean;
  randomizePages?: boolean;
  randomizeQuestions?: boolean;
  progressBar?: boolean;
  previousButton?: boolean;
  autoSave?: boolean;
  timeLimit?: number; // in minutes
  passwordProtected?: boolean;
  password?: string;
  customUrl?: string;
  redirectUrl?: string;
  startDate?: string;
  endDate?: string;
  maxResponses?: number;
  emailNotifications?: boolean;
  notificationEmails?: string[];
}

export interface SurveyBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  backgroundImageUrl?: string;
  fontFamily?: string;
  customCss?: string;
}

export interface SurveyAnalytics {
  totalViews: number;
  totalStarts: number;
  totalCompletes: number;
  completionRate: number;
  averageTime: number; // in seconds
  dropOffPoints: DropOffPoint[];
  responsesByDate: ResponseByDate[];
  deviceBreakdown: DeviceStats;
  locationBreakdown: LocationStats[];
}

export interface DropOffPoint {
  pageId: string;
  questionId?: string;
  count: number;
  percentage: number;
}

export interface ResponseByDate {
  date: string;
  views: number;
  starts: number;
  completes: number;
}

export interface DeviceStats {
  desktop: number;
  tablet: number;
  mobile: number;
}

export interface LocationStats {
  country: string;
  count: number;
  percentage: number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  startedAt: string;
  completedAt?: string;
  status: 'started' | 'completed' | 'partial';
  answers: SurveyAnswer[];
  metadata?: ResponseMetadata;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | string[] | number | boolean | FileAnswer[];
  textValue?: string; // For "Other" responses
  skipped?: boolean;
}

export interface FileAnswer {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

export interface ResponseMetadata {
  timeSpent: number; // in seconds
  device: 'desktop' | 'tablet' | 'mobile';
  browser: string;
  os: string;
  country?: string;
  city?: string;
  referrer?: string;
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'customer_satisfaction' | 'employee_engagement' | 'market_research' | 'event_feedback' | 'product_feedback' | 'education' | 'healthcare' | 'other';
  thumbnail?: string;
  survey: Omit<Survey, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;
  isPremium?: boolean;
  usageCount?: number;
}

export interface SurveyCollection {
  id: string;
  name: string;
  description?: string;
  surveyIds: string[];
  sharedLink?: string;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface SurveyListResponse {
  surveys: Survey[];
  total: number;
  page: number;
  limit: number;
}

export interface SurveyAnalyticsResponse {
  analytics: SurveyAnalytics;
  responses: SurveyResponse[];
  insights: SurveyInsight[];
}

export interface SurveyInsight {
  type: 'completion_rate' | 'drop_off' | 'response_time' | 'answer_distribution' | 'trend';
  title: string;
  description: string;
  value?: string | number;
  trend?: 'up' | 'down' | 'stable';
  recommendation?: string;
}

// Utility Types
export interface QuestionTypeDefinition {
  type: QuestionType;
  name: string;
  description: string;
  icon: string;
  category: 'basic' | 'choice' | 'text' | 'rating' | 'advanced';
  hasOptions: boolean;
  hasValidation: boolean;
  hasLogic: boolean;
  premium?: boolean;
}

export interface SurveyValidationError {
  questionId?: string;
  field: string;
  message: string;
}

export interface SurveyExportOptions {
  format: 'csv' | 'xlsx' | 'pdf' | 'json';
  includeMetadata: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  responseStatus?: ('completed' | 'partial')[];
}

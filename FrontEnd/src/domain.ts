export type SourceType = 'DIRECT' | 'SHARE' | 'ANDROID_NOTIFICATION';
export type ScheduleStatus = 'TODO' | 'DONE';

export type UserSession = {
  token?: string;
  userId: string;
  displayName: string;
  email?: string;
  guest: boolean;
};

export type AnalysisResult = {
  analysisMethod?: 'GROQ' | 'OPENAI' | 'GATEWAY' | 'SERVER_RULES' | 'DEVICE_RULES';
  title: string;
  details: string;
  dueDate: string;
  dueTime?: string | null;
  location?: string | null;
  preparations: string[];
  sourceType: SourceType;
  confidence: number;
  needsReview: boolean;
};

export type Schedule = AnalysisResult & {
  id: string;
  status: ScheduleStatus;
  remindAt?: string | null;
  createdAt?: string;
};

export type CapturedNotification = {
  analysis?: AnalysisResult;
  analysisPending?: boolean;
  sourceType?: SourceType;
  id: string;
  packageName?: string;
  appName: string;
  title: string;
  text: string;
  receivedAt: number;
};

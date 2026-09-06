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
  title: string;
  details: string;
  dueDate: string;
  dueTime?: string | null;
  location?: string | null;
  materials: string[];
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
  id: string;
  appName: string;
  title: string;
  text: string;
  receivedAt: number;
};

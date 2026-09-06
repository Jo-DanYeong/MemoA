import {Platform} from 'react-native';
import Constants from 'expo-constants';

import {AnalysisResult, Schedule, SourceType, UserSession} from '../domain';

const fallbackApiUrl = Platform.select({
  android: 'http://10.0.2.2:8080/api/v1',
  ios: 'http://localhost:8080/api/v1',
  default: 'http://localhost:8080/api/v1',
});
const configuredApiUrl = Constants.expoConfig?.extra?.apiBaseUrl;
const API_BASE_URL = typeof configuredApiUrl === 'string' && configuredApiUrl.length > 0
  ? configuredApiUrl.replace(/\/$/, '')
  : fallbackApiUrl;

type AuthPayload = {
  token: string;
  userId: string;
  displayName: string;
  email: string;
};

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? {Authorization: `Bearer ${token}`} : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message ?? `요청을 처리하지 못했습니다. (${response.status})`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function login(email: string, password: string): Promise<UserSession> {
  const payload = await request<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({email, password}),
  });
  return {...payload, guest: false};
}

export async function signUp(displayName: string, email: string, password: string): Promise<UserSession> {
  const payload = await request<AuthPayload>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({displayName, email, password}),
  });
  return {...payload, guest: false};
}

export function analyzeMessage(message: string, sourceType: SourceType): Promise<AnalysisResult> {
  return request<AnalysisResult>('/analysis', {
    method: 'POST',
    body: JSON.stringify({message, sourceType}),
  });
}

export function fetchSchedules(token: string): Promise<Schedule[]> {
  return request<Schedule[]>('/schedules', {}, token);
}

export function createSchedule(schedule: AnalysisResult, token: string): Promise<Schedule> {
  return request<Schedule>('/schedules', {
    method: 'POST',
    body: JSON.stringify(schedule),
  }, token);
}

export function updateSchedule(schedule: Schedule, token: string): Promise<Schedule> {
  return request<Schedule>(`/schedules/${schedule.id}`, {
    method: 'PUT',
    body: JSON.stringify(schedule),
  }, token);
}

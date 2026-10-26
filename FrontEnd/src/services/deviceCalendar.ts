import * as Calendar from 'expo-calendar';
import {Platform} from 'react-native';

import {Schedule} from '../domain';

const MEMOA_CALENDAR_TITLE = 'MemoA';
const MEMOA_CALENDAR_COLOR = '#428AF5';
const DEFAULT_EVENT_MINUTES = 60;
const DEFAULT_REMINDER_MINUTES = 30;

export type DeviceCalendarSyncStatus =
  | 'synced'
  | 'permission-denied'
  | 'unsupported'
  | 'failed';

export type DeviceCalendarEventDetails = {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
  notes?: string;
  alarms: Calendar.Alarm[];
};

function parseScheduleDate(schedule: Schedule): {startDate: Date; allDay: boolean} {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(schedule.dueDate);
  if (!dateMatch) {
    throw new Error('일정 날짜 형식이 올바르지 않습니다.');
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const normalizedTime = schedule.dueTime?.slice(0, 5) ?? '';
  const timeMatch = /^(?:([01]\d|2[0-3])):([0-5]\d)$/.exec(normalizedTime);
  const allDay = !normalizedTime;

  if (!allDay && !timeMatch) {
    throw new Error('일정 시간 형식이 올바르지 않습니다.');
  }

  const hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);

  if (
    startDate.getFullYear() !== year
    || startDate.getMonth() !== month - 1
    || startDate.getDate() !== day
  ) {
    throw new Error('존재하지 않는 일정 날짜입니다.');
  }

  return {startDate, allDay};
}

export function buildDeviceCalendarEvent(schedule: Schedule): DeviceCalendarEventDetails {
  const {startDate, allDay} = parseScheduleDate(schedule);
  const endDate = new Date(startDate);
  if (allDay) {
    endDate.setDate(endDate.getDate() + 1);
  } else {
    endDate.setMinutes(endDate.getMinutes() + DEFAULT_EVENT_MINUTES);
  }

  const details = schedule.details?.trim();
  const preparations = schedule.preparations
    .map(item => item.trim())
    .filter(Boolean);
  const notes = [
    details,
    preparations.length ? `준비 사항: ${preparations.join(', ')}` : '',
  ].filter(Boolean).join('\n\n');

  return {
    title: schedule.title.trim(),
    startDate,
    endDate,
    allDay,
    location: schedule.location?.trim() || undefined,
    notes: notes || undefined,
    alarms: allDay
      ? []
      : [{
          relativeOffset: -DEFAULT_REMINDER_MINUTES,
          method: Calendar.AlarmMethod.DEFAULT,
        }],
  };
}

export async function deviceCalendarPermissionGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return (await Calendar.getCalendarPermissions()).granted;
  } catch {
    return false;
  }
}

export async function requestDeviceCalendarPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    return (await Calendar.requestCalendarPermissions()).granted;
  } catch {
    return false;
  }
}

async function getOrCreateMemoACalendar(): Promise<Calendar.ExpoCalendar> {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  const existing = calendars.find(calendar => (
    calendar.title === MEMOA_CALENDAR_TITLE && calendar.allowsModifications
  ));

  if (existing) {
    return existing;
  }

  return Calendar.createCalendar({
    title: MEMOA_CALENDAR_TITLE,
    name: MEMOA_CALENDAR_TITLE,
    color: MEMOA_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source: {
      name: MEMOA_CALENDAR_TITLE,
      type: Calendar.SourceType.LOCAL,
      isLocalAccount: true,
    },
    ownerAccount: MEMOA_CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    allowedReminders: [Calendar.AlarmMethod.DEFAULT, Calendar.AlarmMethod.ALERT],
    isVisible: true,
    isSynced: true,
  });
}

export async function syncScheduleToDeviceCalendar(
  schedule: Schedule,
): Promise<DeviceCalendarSyncStatus> {
  if (Platform.OS !== 'android') {
    return 'unsupported';
  }

  try {
    const permission = await Calendar.getCalendarPermissions();
    const granted = permission.granted
      || (await Calendar.requestCalendarPermissions()).granted;

    if (!granted) {
      return 'permission-denied';
    }

    const calendar = await getOrCreateMemoACalendar();
    await calendar.createEvent(buildDeviceCalendarEvent(schedule));
    return 'synced';
  } catch {
    return 'failed';
  }
}

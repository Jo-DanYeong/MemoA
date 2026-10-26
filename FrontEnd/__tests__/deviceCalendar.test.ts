import {Schedule} from '../src/domain';
import {buildDeviceCalendarEvent} from '../src/services/deviceCalendar';

function schedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    id: 'schedule-1',
    title: '[회의] 프로젝트 점검',
    details: '진행 상황을 공유합니다.',
    dueDate: '2026-10-24',
    dueTime: '14:30',
    location: '회의실 A',
    preparations: ['발표 자료', '노트북'],
    sourceType: 'DIRECT',
    confidence: 0.95,
    needsReview: false,
    status: 'TODO',
    ...overrides,
  };
}

describe('buildDeviceCalendarEvent', () => {
  it('시간, 장소, 준비 사항과 30분 전 알림을 캘린더 이벤트로 변환한다', () => {
    const event = buildDeviceCalendarEvent(schedule());

    expect(event.title).toBe('[회의] 프로젝트 점검');
    expect(event.startDate.getHours()).toBe(14);
    expect(event.startDate.getMinutes()).toBe(30);
    expect(event.endDate.getTime() - event.startDate.getTime()).toBe(60 * 60 * 1000);
    expect(event.location).toBe('회의실 A');
    expect(event.notes).toContain('진행 상황을 공유합니다.');
    expect(event.notes).toContain('준비 사항: 발표 자료, 노트북');
    expect(event.alarms).toEqual([expect.objectContaining({relativeOffset: -30})]);
    expect(event.allDay).toBe(false);
  });

  it('시간이 없으면 하루짜리 종일 일정으로 변환한다', () => {
    const event = buildDeviceCalendarEvent(schedule({dueTime: null}));

    expect(event.allDay).toBe(true);
    expect(event.startDate.getHours()).toBe(0);
    expect(event.endDate.getTime() - event.startDate.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(event.alarms).toEqual([]);
  });
});

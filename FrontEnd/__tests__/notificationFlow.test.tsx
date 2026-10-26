import React from 'react';
import {AppState, Pressable} from 'react-native';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {MemoaApp} from '../src/MemoaApp';
import {CapturedNotification, Schedule} from '../src/domain';
import * as capture from '../src/native/capture';
import {AuthScreen} from '../src/screens/AuthScreen';
import {ComposerScreen} from '../src/screens/ComposerScreen';
import {HomeScreen} from '../src/screens/HomeScreen';
import {todayISO, addDaysISO} from '../src/utils/date';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/services/deviceCalendar', () => ({
  syncScheduleToDeviceCalendar: jest.fn().mockResolvedValue('skipped'),
}));
jest.mock('../src/native/capture', () => ({
  getInitialSharedText: jest.fn().mockResolvedValue(null),
  getSharedTextFromUrl: jest.fn().mockResolvedValue(null),
  notificationCaptureAvailable: jest.fn().mockReturnValue(true),
  getCapturedNotifications: jest.fn(),
  removeCapturedNotification: jest.fn().mockResolvedValue(undefined),
  drainCapturedNotifications: jest.fn(),
  requestDetectionAlertPermission: jest.fn(),
  requestInitialBackgroundAccess: jest.fn(),
}));

const candidate: CapturedNotification = {
  id: 'candidate-1',
  packageName: 'example.messenger',
  appName: '메신저',
  title: '팀 대화방',
  text: '내일 오후 2시 회의',
  receivedAt: Date.now(),
};

let renderer: ReactTestRenderer.ReactTestRenderer;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({remove: jest.fn()});
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([candidate]);
});

afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
  }
  jest.restoreAllMocks();
});

async function enterGuest() {
  await act(async () => {
    renderer = ReactTestRenderer.create(<MemoaApp />);
  });
  await act(async () => renderer.root.findByType(AuthScreen).props.onGuest());
}

test('게스트 로그인과 앱 복귀는 홈을 유지하고 권한 설정을 자동으로 열지 않는다', async () => {
  await enterGuest();
  const onAppStateChange = jest.mocked(AppState.addEventListener).mock.calls.find(([event]) => event === 'change')?.[1];
  await act(async () => onAppStateChange?.('active'));

  expect(renderer.root.findAllByType(HomeScreen)).toHaveLength(1);
  expect(renderer.root.findAllByType(ComposerScreen)).toHaveLength(0);
  expect(capture.drainCapturedNotifications).not.toHaveBeenCalled();
  expect(capture.removeCapturedNotification).not.toHaveBeenCalled();
  expect(capture.requestDetectionAlertPermission).not.toHaveBeenCalled();
  expect(capture.requestInitialBackgroundAccess).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('첫 일정을 만들어 볼까요?');
}, 15000);

test('사용자가 후보를 눌러야 열리고 취소하면 후보가 남는다', async () => {
  await enterGuest();
  await act(async () => renderer.root.findByProps({accessibilityLabel: '알림에서 찾은 일정 후보 확인'}).props.onPress());
  await act(async () => renderer.root.findByProps({accessibilityLabel: '메신저 일정 후보 열기'}).props.onPress());

  expect(renderer.root.findByType(ComposerScreen).props.initialMessage).toContain(candidate.text);
  expect(capture.removeCapturedNotification).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(ComposerScreen).props.onBack());
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates).toEqual([candidate]);
});

test('후보 삭제는 선택한 후보만 삭제하고 홈을 유지한다', async () => {
  await enterGuest();
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([]);
  await act(async () => renderer.root.findByProps({accessibilityLabel: '알림에서 찾은 일정 후보 확인'}).props.onPress());
  await act(async () => renderer.root.findByProps({accessibilityLabel: '메신저 일정 후보 삭제'}).props.onPress());

  expect(capture.removeCapturedNotification).toHaveBeenCalledWith(candidate.id);
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates).toEqual([]);
  expect(renderer.root.findAllByType(ComposerScreen)).toHaveLength(0);
});

test('미래 일정만 있을 때 오늘 일정이 없다는 안내를 표시한다', async () => {
  const futureSchedule: Schedule = {
    id: 'future', title: '내일 회의', details: '', dueDate: addDaysISO(1),
    sourceType: 'DIRECT', confidence: 1, needsReview: false, preparations: [], status: 'TODO',
  };
  expect(futureSchedule.dueDate).not.toBe(todayISO());
  await act(async () => {
    renderer = ReactTestRenderer.create(<HomeScreen
      session={{userId: 'guest', displayName: '메모', guest: true}}
      schedules={[futureSchedule]}
      notificationCandidates={[]}
      onCompose={jest.fn()} onCalendar={jest.fn()} onToggle={jest.fn()}
      onOpenNotification={jest.fn()} onDismissNotification={jest.fn()}
    />);
  });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('오늘 예정된 일정이 없어요');
  expect(output).not.toContain('아직 등록된 일정이 없어요');
  expect(renderer.root.findAllByType(Pressable).filter(node => node.props.accessibilityLabel === '알림에서 찾은 일정 후보 확인')).toHaveLength(0);
});

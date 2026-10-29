import React from 'react';
import {AppState, Pressable, Text} from 'react-native';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {MemoaApp} from '../src/MemoaApp';
import {AnalysisResult, CapturedNotification, Schedule} from '../src/domain';
import * as capture from '../src/native/capture';
import {AuthScreen} from '../src/screens/AuthScreen';
import {ComposerScreen} from '../src/screens/ComposerScreen';
import {HomeScreen} from '../src/screens/HomeScreen';
import {ReviewScreen} from '../src/screens/ReviewScreen';
import {analyzeMessage} from '../src/services/api';
import {todayISO, addDaysISO} from '../src/utils/date';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../src/services/deviceCalendar', () => ({
  syncScheduleToDeviceCalendar: jest.fn().mockResolvedValue('skipped'),
}));
jest.mock('../src/services/api', () => ({
  analyzeMessage: jest.fn(),
  fetchSchedules: jest.fn().mockResolvedValue([]),
}));
jest.mock('../src/native/capture', () => ({
  getInitialSharedText: jest.fn().mockResolvedValue(null),
  getSharedTextFromUrl: jest.fn().mockResolvedValue(null),
  notificationCaptureAvailable: jest.fn().mockReturnValue(true),
  getCapturedNotifications: jest.fn(),
  removeCapturedNotification: jest.fn().mockResolvedValue(undefined),
  subscribeToCapturedNotifications: jest.fn(),
  drainCapturedNotifications: jest.fn(),
  requestDetectionAlertPermission: jest.fn(),
  requestInitialBackgroundAccess: jest.fn(),
}));

const candidate: CapturedNotification = {
  id: 'candidate-1',
  packageName: 'example.messenger',
  appName: '메신저',
  title: '팀 대화방',
  text: '내일 오후 2시 프로젝트 회의',
  receivedAt: Date.now(),
};

let renderer: ReactTestRenderer.ReactTestRenderer;
let onCandidatesChanged: () => void;
const removeCaptureSubscription = jest.fn();
const originalAppState = Object.getOwnPropertyDescriptor(AppState, 'currentState');

function setAppState(value: 'active' | 'background') {
  Object.defineProperty(AppState, 'currentState', {configurable: true, writable: true, value});
}
const analyzedCandidate: AnalysisResult = {
  title: '[회의] 프로젝트 진행 상황 회의', details: '프로젝트 진행 상황을 논의합니다.',
  dueDate: addDaysISO(1), dueTime: '14:00', preparations: [], sourceType: 'ANDROID_NOTIFICATION',
  confidence: 0.9, needsReview: false, analysisMethod: 'GROQ',
};

beforeEach(() => {
  jest.clearAllMocks();
  setAppState('active');
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({remove: jest.fn()});
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([candidate]);
  jest.mocked(capture.subscribeToCapturedNotifications).mockImplementation(listener => {
    onCandidatesChanged = listener;
    return {remove: removeCaptureSubscription};
  });
  jest.mocked(analyzeMessage).mockReset().mockResolvedValue(analyzedCandidate);
});

afterEach(async () => {
  if (renderer) {
    await act(async () => renderer.unmount());
  }
  jest.restoreAllMocks();
  if (originalAppState) {
    Object.defineProperty(AppState, 'currentState', originalAppState);
  }
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

test('후보를 자동 분석하되 사용자가 눌러야 결과가 열리고 취소하면 후보가 남는다', async () => {
  await enterGuest();
  expect(renderer.root.findAllByType(ReviewScreen)).toHaveLength(0);
  await act(async () => renderer.root.findByProps({accessibilityLabel: '알림에서 찾은 일정 후보 확인'}).props.onPress());
  expect(JSON.stringify(renderer.toJSON())).toContain('[회의] 프로젝트 진행 상황 회의');
  expect(JSON.stringify(renderer.toJSON())).not.toContain('팀 대화방');
  await act(async () => renderer.root.findByProps({accessibilityLabel: '메신저 일정 후보 열기'}).props.onPress());

  expect(analyzeMessage).toHaveBeenCalledWith(candidate.text, 'ANDROID_NOTIFICATION');
  expect(renderer.root.findByType(ReviewScreen).props.originalMessage).toBe(candidate.text);
  expect(JSON.stringify(renderer.toJSON())).toContain('Groq 추출');
  expect(capture.removeCapturedNotification).not.toHaveBeenCalled();
  await act(async () => renderer.root.findByType(ReviewScreen).props.onBack());
  await act(async () => renderer.root.findByType(ComposerScreen).props.onBack());
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates[0].id).toBe(candidate.id);
  expect(analyzeMessage).toHaveBeenCalledTimes(1);
});

test('서버 연결 실패 결과에는 AI 대신 기본 추출이라고 표시한다', async () => {
  jest.mocked(analyzeMessage).mockRejectedValue(new Error('offline'));
  await enterGuest();
  await act(async () => renderer.root.findByProps({accessibilityLabel: '알림에서 찾은 일정 후보 확인'}).props.onPress());
  await act(async () => renderer.root.findByProps({accessibilityLabel: '메신저 일정 후보 열기'}).props.onPress());
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('기본 추출');
  expect(output).not.toContain('AI 추출');
  expect(output).toContain('서버 연결 없이');
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

test('새 알림 이벤트는 타이머를 기다리지 않고 홈의 후보 수와 제목을 갱신한다', async () => {
  await enterGuest();
  const incoming = {...candidate, id: 'candidate-2', text: '내일 오후 3시 보고서 제출'};
  const incomingAnalysis = {...analyzedCandidate, title: '[제출] 보고서 제출'};
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([incoming, candidate]);
  jest.mocked(analyzeMessage).mockResolvedValueOnce(incomingAnalysis);

  await act(async () => onCandidatesChanged());
  const home = renderer.root.findByType(HomeScreen);
  expect(home.props.notificationCandidates).toHaveLength(2);
  expect(home.props.notificationCandidates[0].analysis.title).toBe('[제출] 보고서 제출');
  const banner = renderer.root.findByProps({accessibilityLabel: '알림에서 찾은 일정 후보 확인'});
  expect(banner.findAllByType(Text).some(node => React.Children.toArray(node.props.children).join('') === '알림에서 찾은 일정 후보 2개가 있어요')).toBe(true);
  expect(analyzeMessage).toHaveBeenCalledTimes(2);
});

test('AI 응답 대기 중에도 새 후보를 즉시 보여주며 분석 요청은 순서대로 보낸다', async () => {
  let finishFirst!: (result: AnalysisResult) => void;
  jest.mocked(analyzeMessage).mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }));
  await enterGuest();
  const incoming = {...candidate, id: 'candidate-2', text: '내일 오후 3시 보고서 제출'};
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([incoming, candidate]);
  jest.mocked(analyzeMessage).mockResolvedValueOnce({...analyzedCandidate, title: '[제출] 보고서 제출'});

  await act(async () => onCandidatesChanged());
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates).toHaveLength(2);
  expect(analyzeMessage).toHaveBeenCalledTimes(1);
  await act(async () => onCandidatesChanged());
  expect(analyzeMessage).toHaveBeenCalledTimes(1);

  await act(async () => finishFirst(analyzedCandidate));
  expect(analyzeMessage).toHaveBeenCalledTimes(2);
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates[0].analysis.title).toBe('[제출] 보고서 제출');
});

test('후보를 읽는 중 발생한 이벤트도 놓치지 않고 새 목록을 다시 읽는다', async () => {
  let finishRead!: (items: CapturedNotification[]) => void;
  jest.mocked(capture.getCapturedNotifications).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  await enterGuest();
  const incoming = {...candidate, id: 'candidate-2', text: '내일 오후 3시 보고서 제출'};
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([incoming, candidate]);
  await act(async () => onCandidatesChanged());
  await act(async () => finishRead([candidate]));
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates).toHaveLength(2);
});

test('삭제된 후보는 늦은 AI 응답으로 복구되지 않고 대기 중인 분석도 취소된다', async () => {
  let finishFirst!: (result: AnalysisResult) => void;
  jest.mocked(analyzeMessage).mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }));
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([
    candidate, {...candidate, id: 'candidate-2', text: '내일 오후 3시 보고서 제출'},
  ]);
  await enterGuest();
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([]);
  await act(async () => onCandidatesChanged());
  await act(async () => finishFirst(analyzedCandidate));
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates).toEqual([]);
  expect(analyzeMessage).toHaveBeenCalledTimes(1);
});

test('백그라운드 알림은 앱 복귀 시 읽고 홈 이벤트 구독을 정리한다', async () => {
  await enterGuest();
  const readCount = jest.mocked(capture.getCapturedNotifications).mock.calls.length;
  setAppState('background');
  const incoming = {...candidate, id: 'candidate-2', text: '내일 오후 3시 보고서 제출'};
  jest.mocked(capture.getCapturedNotifications).mockResolvedValue([incoming, candidate]);
  await act(async () => onCandidatesChanged());
  expect(capture.getCapturedNotifications).toHaveBeenCalledTimes(readCount);

  setAppState('active');
  const onAppStateChange = jest.mocked(AppState.addEventListener).mock.calls.find(([event]) => event === 'change')?.[1];
  await act(async () => onAppStateChange?.('active'));
  expect(renderer.root.findByType(HomeScreen).props.notificationCandidates).toHaveLength(2);
  await act(async () => renderer.unmount());
  expect(removeCaptureSubscription).toHaveBeenCalledTimes(1);
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

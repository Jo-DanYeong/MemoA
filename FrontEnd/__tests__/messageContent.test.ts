import {messageFromNotification} from '../src/services/messageContent';

const candidate = {id: 'one', appName: '메신저', title: '팀 대화방', text: '', receivedAt: 1};

test('only the message body is passed to AI, excluding the sender prefix and source labels', () => {
  expect(messageFromNotification({...candidate, text: '팀 대화방: 내일 오후 2시 회의\n알림 출처: 메신저'}))
    .toBe('내일 오후 2시 회의');
});

test('keeps battery duration information when the percentage is in the notification title', () => {
  expect(messageFromNotification({...candidate, title: '71%', text: '(1시간 10분 후 충전 완료)'}))
    .toBe('71% (1시간 10분 후 충전 완료)');
});

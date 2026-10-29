import {CapturedNotification} from '../domain';

export function messageBody(message: string): string {
  return message.replace(/^\s*(?:알림\s*출처|발신자|대화방|보낸\s*앱|앱\s*이름)\s*[:：]\s*[^\r\n]+/gm, '').trim();
}

export function messageFromNotification(candidate: CapturedNotification): string {
  let body = candidate.text.trim();
  const source = candidate.title.trim();
  for (const separator of [':', '：']) {
    if (source && body.startsWith(source + separator)) {
      body = body.slice(source.length + 1).trim();
      break;
    }
  }
  body = messageBody(body);
  // Battery notifications sometimes split the percentage and duration across title/body.
  if (/^(?:충전량|\d{1,3}\s*%)$/.test(candidate.title.trim()) && /충전|완충/.test(body)) {
    return `${candidate.title.trim()} ${body}`;
  }
  return body;
}

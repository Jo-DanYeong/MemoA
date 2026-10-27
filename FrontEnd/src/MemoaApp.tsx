import React, {useCallback, useEffect, useState} from 'react';
import {AppState, Linking, StyleSheet, Text, View} from 'react-native';

import {BottomNav, MainTab} from './components/BottomNav';
import {AnalysisResult, CapturedNotification, Schedule, SourceType, UserSession} from './domain';
import {
  getCapturedNotifications,
  getInitialSharedText,
  getSharedTextFromUrl,
  removeCapturedNotification,
} from './native/capture';
import {CalendarScreen} from './screens/CalendarScreen';
import {ComposerScreen} from './screens/ComposerScreen';
import {HomeScreen} from './screens/HomeScreen';
import {AuthScreen} from './screens/AuthScreen';
import {ReviewScreen} from './screens/ReviewScreen';
import {ScheduleListScreen} from './screens/ScheduleListScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {analyzeMessage, createSchedule, fetchSchedules, login, signUp, updateSchedule} from './services/api';
import {syncScheduleToDeviceCalendar} from './services/deviceCalendar';
import {analyzeLocally} from './services/localAnalyzer';
import {colors} from './theme';

function messageFromNotification(candidate: CapturedNotification): string {
  const sourceTitle = candidate.title.trim();
  const body = candidate.text.trim();
  if (!sourceTitle || body.includes(sourceTitle)) {
    return body;
  }

  const combined = `${sourceTitle} ${body}`.replace(/\s+/g, ' ').trim();
  if (/(?:충전|완충|\d{1,3}\s*%)/.test(combined)) {
    return combined;
  }
  return `${body}\n알림 출처: ${sourceTitle}`;
}

export function MemoaApp() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [tab, setTab] = useState<MainTab | 'compose'>('home');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [captureMessage, setCaptureMessage] = useState('');
  const [captureSource, setCaptureSource] = useState<SourceType>('DIRECT');
  const [usedLocalFallback, setUsedLocalFallback] = useState(false);
  const [toast, setToast] = useState('');
  const [notificationCandidates, setNotificationCandidates] = useState<CapturedNotification[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  }, []);

  const openCapturedMessage = useCallback((message: string, source: SourceType) => {
    setSelectedCandidateId(null);
    setCaptureMessage(message);
    setCaptureSource(source);
    setAnalysis(null);
    setTab('compose');
  }, []);

  useEffect(() => {
    getInitialSharedText().then(message => {
      if (message) {
        openCapturedMessage(message, 'SHARE');
      }
    });
    const linkSubscription = Linking.addEventListener('url', async event => {
      const message = await getSharedTextFromUrl(event.url);
      if (message) {
        openCapturedMessage(message, 'SHARE');
      }
    });
    return () => linkSubscription.remove();
  }, [openCapturedMessage]);

  useEffect(() => {
    if (!session || tab !== 'home') {
      return;
    }
    let cancelled = false;
    const checkNotifications = async () => {
      try {
        const pending = await getCapturedNotifications();
        if (!cancelled) {
          setNotificationCandidates(pending);
        }
      } catch {
        // A temporary listener error must not interrupt the home screen.
      }
    };
    checkNotifications();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkNotifications();
      }
    });
    const refreshTimer = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkNotifications();
      }
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
      subscription.remove();
    };
  }, [session, tab]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }
    let cancelled = false;
    fetchSchedules(session.token)
      .then(remoteSchedules => { if (!cancelled) { setSchedules(remoteSchedules); } })
      .catch(() => { if (!cancelled) { showToast('서버의 일정을 불러오지 못했어요.'); } });
    return () => { cancelled = true; };
  }, [session, showToast]);

  const authenticate = async (mode: 'login' | 'signup', values: {name: string; email: string; password: string}) => {
    const nextSession = mode === 'login'
      ? await login(values.email, values.password)
      : await signUp(values.name, values.email, values.password);
    setSession(nextSession);
    setSchedules([]);
    setTab(captureMessage ? 'compose' : 'home');
  };

  const enterGuest = () => {
    setSession({userId: 'guest', displayName: '메모', guest: true});
    setSchedules([]);
    setTab(captureMessage ? 'compose' : 'home');
  };

  const openNotification = (candidate: CapturedNotification) => {
    openCapturedMessage(messageFromNotification(candidate), 'ANDROID_NOTIFICATION');
    setSelectedCandidateId(candidate.id);
  };

  const dismissNotification = async (candidate: CapturedNotification) => {
    try {
      await removeCapturedNotification(candidate.id);
      setNotificationCandidates(current => current.filter(item => item.id !== candidate.id));
    } catch {
      showToast('일정 후보를 삭제하지 못했어요. 다시 시도해 주세요.');
    }
  };

  const composeMessage = () => {
    setSelectedCandidateId(null);
    setCaptureMessage('');
    setCaptureSource('DIRECT');
    setTab('compose');
  };

  const logout = () => {
    setSession(null);
    setSchedules([]);
    setNotificationCandidates([]);
    setSelectedCandidateId(null);
    setAnalysis(null);
    setCaptureMessage('');
    setCaptureSource('DIRECT');
    setTab('home');
  };

  const runAnalysis = async (message: string, source: SourceType): Promise<AnalysisResult> => {
    setCaptureMessage(message);
    setCaptureSource(source);
    try {
      const result = await analyzeMessage(message, source);
      setUsedLocalFallback(false);
      return result;
    } catch {
      setUsedLocalFallback(true);
      return analyzeLocally(message, source);
    }
  };

  const saveAnalysis = async (result: AnalysisResult) => {
    const saved = session?.token
      ? await createSchedule(result, session.token)
      : {...result, id: `local-${Date.now()}`, status: 'TODO' as const, createdAt: new Date().toISOString()};
    setSchedules(current => [saved, ...current]);
    if (selectedCandidateId) {
      await removeCapturedNotification(selectedCandidateId).catch(() => undefined);
      setNotificationCandidates(current => current.filter(item => item.id !== selectedCandidateId));
      setSelectedCandidateId(null);
    }
    const calendarSync = await syncScheduleToDeviceCalendar(saved);
    setAnalysis(null);
    setCaptureMessage('');
    setCaptureSource('DIRECT');
    setTab('home');
    if (calendarSync === 'synced') {
      showToast('MemoA와 휴대폰 캘린더에 저장했어요.');
    } else if (calendarSync === 'permission-denied') {
      showToast('MemoA에 저장했어요. 설정에서 캘린더 연동을 켜 주세요.');
    } else if (calendarSync === 'failed') {
      showToast('MemoA에는 저장했지만 휴대폰 캘린더 연동에 실패했어요.');
    } else {
      showToast('일정에 안전하게 저장했어요.');
    }
  };

  const toggleSchedule = async (schedule: Schedule) => {
    const changed: Schedule = {...schedule, status: schedule.status === 'DONE' ? 'TODO' : 'DONE'};
    setSchedules(current => current.map(item => item.id === changed.id ? changed : item));
    if (session?.token) {
      try {
        const saved = await updateSchedule(changed, session.token);
        setSchedules(current => current.map(item => item.id === saved.id ? saved : item));
      } catch {
        setSchedules(current => current.map(item => item.id === schedule.id ? schedule : item));
        showToast('변경 내용을 서버에 저장하지 못했어요.');
      }
    }
  };

  if (!session) {
    return <AuthScreen onAuthenticate={authenticate} onGuest={enterGuest} />;
  }

  if (analysis) {
    return (
      <ReviewScreen
        initial={analysis}
        originalMessage={captureMessage}
        onBack={() => setAnalysis(null)}
        onSave={saveAnalysis}
        usedLocalFallback={usedLocalFallback}
      />
    );
  }

  return (
    <View style={styles.app}>
      <View style={styles.content}>
        {tab === 'home' ? (
          <HomeScreen
            onCalendar={() => setTab('calendar')}
            onCompose={composeMessage}
            notificationCandidates={notificationCandidates}
            onOpenNotification={openNotification}
            onDismissNotification={dismissNotification}
            onToggle={toggleSchedule}
            schedules={schedules}
            session={session}
          />
        ) : null}
        {tab === 'calendar' ? (
          <CalendarScreen
            onCompose={composeMessage}
            onToggle={toggleSchedule}
            schedules={schedules}
          />
        ) : null}
        {tab === 'list' ? (
          <ScheduleListScreen onToggle={toggleSchedule} schedules={schedules} />
        ) : null}
        {tab === 'compose' ? (
          <ComposerScreen
            initialMessage={captureMessage}
            initialSource={captureSource}
            onAnalyze={runAnalysis}
            onAnalyzed={setAnalysis}
            onBack={() => setTab('home')}
          />
        ) : null}
        {tab === 'settings' ? <SettingsScreen onLogout={logout} session={session} /> : null}
      </View>
      {tab !== 'compose' ? <BottomNav active={tab} onChange={setTab} /> : null}
      {toast ? <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {backgroundColor: colors.background, flex: 1},
  content: {flex: 1},
  toast: {alignSelf: 'center', backgroundColor: colors.ink, borderRadius: 14, bottom: 88, maxWidth: '88%', paddingHorizontal: 17, paddingVertical: 11, position: 'absolute'},
  toastText: {color: colors.white, fontSize: 11, fontWeight: '800', textAlign: 'center'},
});

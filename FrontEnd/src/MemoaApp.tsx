import React, {useCallback, useEffect, useState} from 'react';
import {AppState, Linking, StyleSheet, Text, View} from 'react-native';

import {BottomNav, MainTab} from './components/BottomNav';
import {AnalysisResult, Schedule, SourceType, UserSession} from './domain';
import {drainCapturedNotifications, getInitialSharedText, getSharedTextFromUrl} from './native/capture';
import {CalendarScreen} from './screens/CalendarScreen';
import {ComposerScreen} from './screens/ComposerScreen';
import {HomeScreen} from './screens/HomeScreen';
import {AuthScreen} from './screens/AuthScreen';
import {ReviewScreen} from './screens/ReviewScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {analyzeMessage, createSchedule, fetchSchedules, login, signUp, updateSchedule} from './services/api';
import {analyzeLocally} from './services/localAnalyzer';
import {colors} from './theme';
import {addDaysISO} from './utils/date';

function demoSchedules(): Schedule[] {
  return [
    {
      id: 'demo-science',
      title: '과학 수행평가 보고서 제출',
      details: '실험 결과표를 확인하고 최종본을 제출합니다.',
      dueDate: addDaysISO(1),
      dueTime: '15:00',
      location: '과학실',
      materials: ['실험 노트', 'USB'],
      sourceType: 'SHARE',
      confidence: 0.94,
      needsReview: false,
      status: 'TODO',
    },
    {
      id: 'demo-meeting',
      title: '동아리 프로젝트 회의',
      details: '발표 역할을 정합니다.',
      dueDate: addDaysISO(3),
      dueTime: '17:30',
      location: '도서관 세미나실',
      materials: ['기획안'],
      sourceType: 'ANDROID_NOTIFICATION',
      confidence: 0.89,
      needsReview: false,
      status: 'TODO',
    },
  ];
}

export function MemoaApp() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [tab, setTab] = useState<MainTab>('home');
  const [schedules, setSchedules] = useState<Schedule[]>(demoSchedules);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [captureMessage, setCaptureMessage] = useState('');
  const [captureSource, setCaptureSource] = useState<SourceType>('DIRECT');
  const [usedLocalFallback, setUsedLocalFallback] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  }, []);

  const openCapturedMessage = useCallback((message: string, source: SourceType) => {
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
    if (!session) {
      return;
    }
    const checkNotifications = async () => {
      const pending = await drainCapturedNotifications();
      if (pending.length > 0) {
        openCapturedMessage(pending[0].text, 'ANDROID_NOTIFICATION');
        showToast(`${pending[0].appName} 알림에서 일정 후보를 찾았어요.`);
      }
    };
    checkNotifications();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        checkNotifications();
      }
    });
    return () => subscription.remove();
  }, [openCapturedMessage, session, showToast]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }
    fetchSchedules(session.token)
      .then(remoteSchedules => setSchedules(remoteSchedules))
      .catch(() => showToast('서버의 일정을 불러오지 못했어요.'));
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
    setSchedules(demoSchedules());
    setTab(captureMessage ? 'compose' : 'home');
  };

  const runAnalysis = async (message: string, source: SourceType): Promise<AnalysisResult> => {
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
    setAnalysis(null);
    setCaptureMessage('');
    setCaptureSource('DIRECT');
    setTab('home');
    showToast('일정에 안전하게 저장했어요.');
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
            onCompose={() => {setCaptureMessage(''); setCaptureSource('DIRECT'); setTab('compose');}}
            onToggle={toggleSchedule}
            schedules={schedules}
            session={session}
          />
        ) : null}
        {tab === 'calendar' ? <CalendarScreen onToggle={toggleSchedule} schedules={schedules} /> : null}
        {tab === 'compose' ? (
          <ComposerScreen
            initialMessage={captureMessage}
            initialSource={captureSource}
            onAnalyze={runAnalysis}
            onAnalyzed={setAnalysis}
          />
        ) : null}
        {tab === 'settings' ? <SettingsScreen onLogout={() => {setSession(null); setTab('home');}} session={session} /> : null}
      </View>
      <BottomNav active={tab} onChange={nextTab => {
        if (nextTab === 'compose' && tab !== 'compose') {
          setCaptureMessage('');
          setCaptureSource('DIRECT');
        }
        setTab(nextTab);
      }} />
      {toast ? <View pointerEvents="none" style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {backgroundColor: colors.background, flex: 1},
  content: {flex: 1},
  toast: {alignSelf: 'center', backgroundColor: colors.ink, borderRadius: 18, bottom: 88, maxWidth: '88%', paddingHorizontal: 17, paddingVertical: 11, position: 'absolute'},
  toastText: {color: colors.white, fontSize: 11, fontWeight: '800', textAlign: 'center'},
});

import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {CapturedNotification, Schedule, UserSession} from '../domain';
import {ScheduleCard} from '../components/ScheduleCard';
import {colors, radius} from '../theme';
import {todayISO} from '../utils/date';

type Props = {
  session: UserSession;
  schedules: Schedule[];
  onCompose: () => void;
  onCalendar: () => void;
  onToggle: (schedule: Schedule) => void;
  notificationCandidates: CapturedNotification[];
  onOpenNotification: (candidate: CapturedNotification) => void;
  onDismissNotification: (candidate: CapturedNotification) => void;
};

export function HomeScreen({session, schedules, onCompose, onCalendar, onToggle, notificationCandidates, onOpenNotification, onDismissNotification}: Props) {
  const insets = useSafeAreaInsets();
  const [showCandidates, setShowCandidates] = useState(false);
  const today = schedules
    .filter(schedule => schedule.status === 'TODO' && schedule.dueDate === todayISO())
    .sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? ''));
  const upcoming = [...schedules]
    .filter(schedule => schedule.status === 'TODO' && schedule.dueDate > todayISO())
    .sort((a, b) => `${a.dueDate}${a.dueTime ?? ''}`.localeCompare(`${b.dueDate}${b.dueTime ?? ''}`))
    .slice(0, 2);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 16)}]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.hello}>안녕하세요, {session.displayName}님 👋</Text>
          <Pressable accessibilityLabel="캘린더 보기" onPress={onCalendar} style={styles.bell}><Text style={styles.bellText}>▣</Text>{today.length ? <View style={styles.alertDot} /> : null}</Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>분석할 메시지를 입력해 보세요</Text>
          <Text style={styles.heroBody}>대화 텍스트에서 자동으로 일정을 만들어 드려요.</Text>
          <Pressable onPress={onCompose} style={({pressed}) => [styles.heroButton, pressed && styles.pressed]}>
            <Text style={styles.heroButtonText}>직접 입력</Text>
          </Pressable>
          <Pressable onPress={onCompose} style={({pressed}) => pressed && styles.pressed}>
            <Text style={styles.shareLink}>다른 앱에서 공유하기</Text>
          </Pressable>
        </View>

        {notificationCandidates.length > 0 ? (
          <>
            <Pressable accessibilityLabel="알림에서 찾은 일정 후보 확인" onPress={() => setShowCandidates(current => !current)} style={({pressed}) => [styles.candidate, pressed && styles.pressed]}>
              <Text style={styles.candidateText}>알림에서 찾은 일정 후보 {notificationCandidates.length}개가 있어요</Text>
              <View style={styles.candidateButton}><Text style={styles.candidateButtonText}>{showCandidates ? '접기' : '확인하기'}</Text></View>
            </Pressable>
            {showCandidates ? notificationCandidates.map(candidate => (
              <View key={candidate.id} style={styles.candidateRow}>
                <Pressable accessibilityLabel={`${candidate.appName} 일정 후보 열기`} onPress={() => onOpenNotification(candidate)} style={styles.candidateCopy}>
                  <Text style={styles.candidateApp}>{candidate.appName}</Text>
                  {candidate.title ? <Text numberOfLines={1} style={styles.candidateTitle}>{candidate.title}</Text> : null}
                  <Text numberOfLines={2} style={styles.candidateBody}>{candidate.text}</Text>
                </Pressable>
                <Pressable accessibilityLabel={`${candidate.appName} 일정 후보 삭제`} onPress={() => onDismissNotification(candidate)} style={styles.dismissButton}>
                  <Text style={styles.dismissText}>삭제</Text>
                </Pressable>
              </View>
            )) : null}
          </>
        ) : null}

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>오늘의 일정</Text></View>
        <View style={styles.list}>
          {today.length ? today.map(schedule => (
            <ScheduleCard compact key={schedule.id} onToggle={onToggle} schedule={schedule} />
          )) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>▣</Text></View>
              <Text style={styles.emptyTitle}>{schedules.length === 0 ? '첫 일정을 만들어 볼까요?' : '오늘 예정된 일정이 없어요'}</Text>
              <Text style={styles.emptyBody}>{schedules.length === 0 ? '메시지를 공유하거나 직접 입력해 시작해 보세요' : '다가오는 일정은 캘린더에서 확인할 수 있어요'}</Text>
            </View>
          )}
        </View>

        {upcoming.length ? (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>다가오는 일정</Text></View>
            <View style={styles.list}>
              {upcoming.map(schedule => <ScheduleCard compact key={schedule.id} onToggle={onToggle} schedule={schedule} />)}
            </View>
          </>
        ) : null}
      </ScrollView>

      <Pressable accessibilityLabel="메시지 분석" onPress={onCompose} style={({pressed}) => [styles.floatingButton, pressed && styles.pressed]}>
        <Text style={styles.floatingButtonText}>✣  메시지 분석</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {backgroundColor: colors.background, flex: 1},
  page: {paddingBottom: 92, paddingHorizontal: 16},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, minHeight: 42},
  hello: {color: colors.ink, flex: 1, fontSize: 18, fontWeight: '900', letterSpacing: -0.5},
  bell: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 36},
  bellText: {color: colors.ink, fontSize: 17, fontWeight: '800'},
  alertDot: {backgroundColor: colors.coral, borderColor: colors.white, borderRadius: 5, borderWidth: 2, height: 9, position: 'absolute', right: 4, top: 4, width: 9},
  hero: {alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: radius.medium, padding: 16},
  heroTitle: {alignSelf: 'stretch', color: colors.ink, fontSize: 14, fontWeight: '900'},
  heroBody: {alignSelf: 'stretch', color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4},
  heroButton: {alignItems: 'center', alignSelf: 'stretch', backgroundColor: colors.accent, borderRadius: radius.pill, justifyContent: 'center', marginTop: 12, minHeight: 38},
  heroButtonText: {color: colors.white, fontSize: 12, fontWeight: '900'},
  shareLink: {color: colors.accent, fontSize: 10, fontWeight: '800', marginTop: 9, textDecorationLine: 'underline'},
  candidate: {alignItems: 'center', backgroundColor: colors.amberSoft, borderRadius: radius.medium, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 13, paddingVertical: 12},
  candidateText: {color: colors.amber, flex: 1, fontSize: 11, fontWeight: '800', lineHeight: 16, paddingRight: 8},
  candidateButton: {backgroundColor: colors.surface, borderColor: '#E6C46F', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7},
  candidateButtonText: {color: colors.amber, fontSize: 9, fontWeight: '900'},
  candidateRow: {alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: 13, paddingVertical: 12},
  candidateCopy: {flex: 1, paddingRight: 8},
  candidateApp: {color: colors.accent, fontSize: 10, fontWeight: '800'},
  candidateTitle: {color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 5},
  candidateBody: {color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 4},
  dismissButton: {padding: 12},
  dismissText: {color: colors.textMuted, fontSize: 11},
  sectionHeader: {marginBottom: 10, marginTop: 20},
  sectionTitle: {color: colors.textMuted, fontSize: 11, fontWeight: '800'},
  list: {gap: 9},
  empty: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, padding: 35},
  emptyIcon: {alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44},
  emptyIconText: {color: colors.accent, fontSize: 20},
  emptyTitle: {color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 13},
  emptyBody: {color: colors.textMuted, fontSize: 9, marginTop: 7, textAlign: 'center'},
  floatingButton: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.pill, bottom: 14, elevation: 5, justifyContent: 'center', minHeight: 44, paddingHorizontal: 17, position: 'absolute', right: 16, shadowColor: colors.accent, shadowOffset: {height: 4, width: 0}, shadowOpacity: 0.25, shadowRadius: 8},
  floatingButtonText: {color: colors.white, fontSize: 11, fontWeight: '900'},
  pressed: {opacity: 0.72},
});

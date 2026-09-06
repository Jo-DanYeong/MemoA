import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Schedule, UserSession} from '../domain';
import {ScheduleCard} from '../components/ScheduleCard';
import {colors, radius} from '../theme';
import {formatKoreanDate, todayISO} from '../utils/date';

type Props = {
  session: UserSession;
  schedules: Schedule[];
  onCompose: () => void;
  onCalendar: () => void;
  onToggle: (schedule: Schedule) => void;
};

export function HomeScreen({session, schedules, onCompose, onCalendar, onToggle}: Props) {
  const insets = useSafeAreaInsets();
  const upcoming = [...schedules]
    .filter(schedule => schedule.status === 'TODO' && schedule.dueDate >= todayISO())
    .sort((a, b) => `${a.dueDate}${a.dueTime ?? ''}`.localeCompare(`${b.dueDate}${b.dueTime ?? ''}`))
    .slice(0, 3);
  const completed = schedules.filter(schedule => schedule.status === 'DONE').length;

  return (
    <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 18)}]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.date}>{formatKoreanDate(todayISO(), true)}</Text>
          <Text style={styles.hello}>{session.displayName}님, 안녕하세요</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{session.displayName.slice(0, 1)}</Text></View>
      </View>

      <Pressable onPress={onCompose} style={({pressed}) => [styles.hero, pressed && styles.pressed]}>
        <View style={styles.heroCopy}>
          <View style={styles.aiPill}><Text style={styles.aiPillText}>✦ AI 메시지 정리</Text></View>
          <Text style={styles.heroTitle}>받은 메시지,{`\n`}그대로 붙여 넣으세요.</Text>
          <Text style={styles.heroBody}>날짜와 할 일, 준비물을 찾아드릴게요.</Text>
          <View style={styles.heroButton}><Text style={styles.heroButtonText}>메시지 분석하기  →</Text></View>
        </View>
        <View style={styles.heroArt}>
          <View style={styles.paperBack} />
          <View style={styles.paper}>
            <View style={styles.paperLine} />
            <View style={styles.paperLineShort} />
            <View style={styles.paperDate}><Text style={styles.paperDateText}>12</Text></View>
          </View>
        </View>
      </Pressable>

      <View style={styles.summaryRow}>
        <View style={[styles.summary, styles.summaryMint]}>
          <Text style={styles.summaryNumber}>{upcoming.length}</Text>
          <Text style={styles.summaryLabel}>다가오는 일정</Text>
        </View>
        <View style={[styles.summary, styles.summaryPeach]}>
          <Text style={styles.summaryNumber}>{completed}</Text>
          <Text style={styles.summaryLabel}>완료한 일정</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>곧 해야 할 일</Text>
        <Pressable onPress={onCalendar}><Text style={styles.sectionAction}>전체 보기</Text></Pressable>
      </View>

      <View style={styles.list}>
        {upcoming.length ? upcoming.map(schedule => (
          <ScheduleCard key={schedule.id} onToggle={onToggle} schedule={schedule} />
        )) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✓</Text>
            <Text style={styles.emptyTitle}>급한 일정이 없어요</Text>
            <Text style={styles.emptyBody}>메시지를 추가하면 이곳에 정리해드릴게요.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {backgroundColor: colors.background, paddingBottom: 30, paddingHorizontal: 20},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22},
  date: {color: colors.textMuted, fontSize: 11, fontWeight: '700'},
  hello: {color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 3},
  avatar: {alignItems: 'center', backgroundColor: colors.mint, borderColor: colors.surface, borderRadius: 21, borderWidth: 3, height: 44, justifyContent: 'center', width: 44},
  avatarText: {color: colors.ink, fontSize: 16, fontWeight: '900'},
  hero: {backgroundColor: colors.ink, borderRadius: radius.large, flexDirection: 'row', minHeight: 220, overflow: 'hidden', padding: 22},
  heroCopy: {flex: 1, zIndex: 2},
  aiPill: {alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6},
  aiPillText: {color: colors.ink, fontSize: 10, fontWeight: '900'},
  heroTitle: {color: colors.white, fontSize: 23, fontWeight: '900', letterSpacing: -0.7, lineHeight: 30, marginTop: 15},
  heroBody: {color: '#C5D2CD', fontSize: 11, lineHeight: 17, marginTop: 8},
  heroButton: {alignSelf: 'flex-start', borderBottomColor: colors.accent, borderBottomWidth: 1, marginTop: 17, paddingBottom: 3},
  heroButtonText: {color: colors.accent, fontSize: 12, fontWeight: '800'},
  heroArt: {bottom: 0, height: 150, position: 'absolute', right: -6, width: 128},
  paperBack: {backgroundColor: colors.accent, borderRadius: 17, height: 105, position: 'absolute', right: 10, top: 25, transform: [{rotate: '13deg'}], width: 88},
  paper: {backgroundColor: colors.white, borderRadius: 17, height: 110, padding: 17, position: 'absolute', right: 27, top: 34, transform: [{rotate: '-7deg'}], width: 90},
  paperLine: {backgroundColor: colors.ink, borderRadius: 3, height: 5, opacity: 0.75, width: 43},
  paperLineShort: {backgroundColor: colors.line, borderRadius: 3, height: 5, marginTop: 8, width: 31},
  paperDate: {alignItems: 'center', backgroundColor: colors.peach, borderRadius: 12, bottom: 13, height: 33, justifyContent: 'center', position: 'absolute', right: 12, width: 33},
  paperDateText: {color: colors.ink, fontSize: 13, fontWeight: '900'},
  summaryRow: {flexDirection: 'row', gap: 10, marginTop: 12},
  summary: {borderRadius: radius.medium, flex: 1, padding: 15},
  summaryMint: {backgroundColor: colors.mint},
  summaryPeach: {backgroundColor: colors.peach},
  summaryNumber: {color: colors.ink, fontSize: 23, fontWeight: '900'},
  summaryLabel: {color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3},
  sectionHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 27},
  sectionTitle: {color: colors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.4},
  sectionAction: {color: colors.textMuted, fontSize: 12, fontWeight: '700'},
  list: {gap: 10},
  empty: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderStyle: 'dashed', borderWidth: 1, padding: 25},
  emptyIcon: {color: colors.ink, fontSize: 22, fontWeight: '900'},
  emptyTitle: {color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 8},
  emptyBody: {color: colors.textMuted, fontSize: 11, marginTop: 5},
  pressed: {opacity: 0.88},
});

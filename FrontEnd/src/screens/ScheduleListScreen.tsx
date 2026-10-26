import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Schedule} from '../domain';
import {ScheduleCard} from '../components/ScheduleCard';
import {colors, radius} from '../theme';
import {todayISO} from '../utils/date';

type Props = {
  schedules: Schedule[];
  onToggle: (schedule: Schedule) => void;
};

type StatusFilter = 'today' | 'upcoming' | 'done';
type CategoryFilter = 'all' | 'meeting' | 'assignment' | 'appointment';

const statusItems: {key: StatusFilter; label: string}[] = [
  {key: 'today', label: '오늘'},
  {key: 'upcoming', label: '예정'},
  {key: 'done', label: '완료'},
];

const categoryItems: {key: CategoryFilter; label: string}[] = [
  {key: 'all', label: '전체'},
  {key: 'meeting', label: '회의'},
  {key: 'assignment', label: '과제'},
  {key: 'appointment', label: '약속'},
];

function matchesCategory(schedule: Schedule, category: CategoryFilter) {
  if (category === 'all') {
    return true;
  }
  const source = `${schedule.title} ${schedule.details}`;
  if (category === 'meeting') {
    return /회의|모임|설명회|세미나/.test(source);
  }
  if (category === 'assignment') {
    return /과제|제출|보고서|시험|발표/.test(source);
  }
  return /약속|방문|예약|만남/.test(source);
}

export function ScheduleListScreen({schedules, onToggle}: Props) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<StatusFilter>('today');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const filtered = useMemo(() => schedules
    .filter(schedule => {
      if (status === 'done') {
        return schedule.status === 'DONE';
      }
      if (schedule.status === 'DONE') {
        return false;
      }
      return status === 'today' ? schedule.dueDate === todayISO() : schedule.dueDate > todayISO();
    })
    .filter(schedule => matchesCategory(schedule, category))
    .sort((a, b) => `${a.dueDate}${a.dueTime ?? ''}`.localeCompare(`${b.dueDate}${b.dueTime ?? ''}`)), [category, schedules, status]);

  return (
    <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 16)}]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>일정 목록</Text>
        <Text style={styles.search}>⌕</Text>
      </View>
      <View style={styles.segment}>
        {statusItems.map(item => (
          <Pressable key={item.key} onPress={() => setStatus(item.key)} style={[styles.segmentButton, status === item.key && styles.segmentActive]}>
            <Text style={[styles.segmentText, status === item.key && styles.segmentTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.filters}>
        {categoryItems.map(item => (
          <Pressable key={item.key} onPress={() => setCategory(item.key)} style={[styles.filter, category === item.key && styles.filterActive]}>
            <Text style={[styles.filterText, category === item.key && styles.filterTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.list}>
        {filtered.length ? filtered.map(schedule => (
          <ScheduleCard compact key={schedule.id} onToggle={onToggle} schedule={schedule} />
        )) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>표시할 일정이 없어요</Text>
            <Text style={styles.emptyBody}>다른 분류를 선택하거나 메시지를 분석해 보세요.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {backgroundColor: colors.background, flexGrow: 1, paddingBottom: 28, paddingHorizontal: 16},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52},
  title: {color: colors.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.5},
  search: {color: colors.ink, fontSize: 28, lineHeight: 30},
  segment: {backgroundColor: '#E7E7ED', borderRadius: radius.pill, flexDirection: 'row', marginTop: 8, padding: 3},
  segmentButton: {alignItems: 'center', borderRadius: radius.pill, flex: 1, paddingVertical: 8},
  segmentActive: {backgroundColor: colors.surface},
  segmentText: {color: colors.textMuted, fontSize: 11, fontWeight: '700'},
  segmentTextActive: {color: colors.text, fontWeight: '900'},
  filters: {flexDirection: 'row', gap: 7, marginTop: 10},
  filter: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7},
  filterActive: {backgroundColor: colors.accent, borderColor: colors.accent},
  filterText: {color: colors.textMuted, fontSize: 10, fontWeight: '700'},
  filterTextActive: {color: colors.white},
  list: {gap: 10, marginTop: 15},
  empty: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, marginTop: 8, padding: 34},
  emptyTitle: {color: colors.text, fontSize: 14, fontWeight: '800'},
  emptyBody: {color: colors.textMuted, fontSize: 10, marginTop: 6, textAlign: 'center'},
});

import React, {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Schedule} from '../domain';
import {ScheduleCard} from '../components/ScheduleCard';
import {colors, radius} from '../theme';
import {calendarCells, formatKoreanDate, shiftMonth, todayISO} from '../utils/date';

type Props = {
  schedules: Schedule[];
  onToggle: (schedule: Schedule) => void;
  onCompose: () => void;
};

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarScreen({schedules, onToggle, onCompose}: Props) {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState(todayISO());
  const cells = useMemo(() => calendarCells(month), [month]);
  const selectedSchedules = schedules
    .filter(schedule => schedule.dueDate === selected)
    .sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? ''));
  const datesWithSchedules = useMemo(() => new Set(schedules.map(schedule => schedule.dueDate)), [schedules]);

  return (
    <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 18)}]} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <Text style={styles.title}>캘린더</Text>
      </View>

      <View style={styles.calendar}>
        <View style={styles.monthHeader}>
          <Pressable accessibilityLabel="이전 달" onPress={() => setMonth(current => shiftMonth(current, -1))} style={styles.arrow}><Text style={styles.arrowText}>‹</Text></Pressable>
          <Text style={styles.monthTitle}>{month.getFullYear()}년 {month.getMonth() + 1}월</Text>
          <Pressable accessibilityLabel="다음 달" onPress={() => setMonth(current => shiftMonth(current, 1))} style={styles.arrow}><Text style={styles.arrowText}>›</Text></Pressable>
        </View>
        <View style={styles.weekRow}>
          {weekdays.map((weekday, index) => <Text key={weekday} style={[styles.weekday, index === 0 && styles.sunday]}>{weekday}</Text>)}
        </View>
        <View style={styles.grid}>
          {cells.map((cell, index) => {
            const isSelected = cell.date === selected;
            const isToday = cell.date === todayISO();
            return (
              <Pressable
                disabled={!cell.date}
                key={cell.key}
                onPress={() => cell.date && setSelected(cell.date)}
                style={styles.dayCell}>
                {cell.date ? (
                  <View style={[styles.dayCircle, isSelected && styles.daySelected, isToday && !isSelected && styles.dayToday]}>
                    <Text style={[styles.dayText, index % 7 === 0 && styles.sunday, isSelected && styles.dayTextSelected]}>{cell.day}</Text>
                    {datesWithSchedules.has(cell.date) ? <View style={[styles.dot, isSelected && styles.dotSelected]} /> : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.selectionHeader}>
        <Text style={styles.selectionTitle}>{formatKoreanDate(selected)}</Text>
        <View style={styles.countPill}><Text style={styles.countText}>{selectedSchedules.length}개</Text></View>
      </View>
      <View style={styles.list}>
        {selectedSchedules.length ? selectedSchedules.map(schedule => (
          <ScheduleCard compact key={schedule.id} onToggle={onToggle} schedule={schedule} />
        )) : (
          <View style={styles.empty}>
            <Text style={styles.emptyMark}>· · ·</Text>
            <Text style={styles.emptyTitle}>등록된 일정이 없어요</Text>
            <Text style={styles.emptyBody}>아래 + 버튼에서 메시지를 분석해보세요.</Text>
          </View>
        )}
      </View>
      <Pressable accessibilityLabel="새 일정 분석" onPress={onCompose} style={({pressed}) => [styles.floatingButton, pressed && styles.pressed]}>
        <Text style={styles.floatingButtonText}>+</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {backgroundColor: colors.background, minHeight: '100%', paddingBottom: 30, paddingHorizontal: 16},
  topRow: {alignItems: 'center', flexDirection: 'row', minHeight: 52},
  title: {color: colors.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.5},
  calendar: {backgroundColor: colors.surface, borderBottomColor: colors.line, borderBottomWidth: 1, marginHorizontal: -16, paddingBottom: 12, paddingHorizontal: 16},
  monthHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, marginTop: 5},
  monthTitle: {color: colors.ink, fontSize: 16, fontWeight: '900'},
  arrow: {alignItems: 'center', height: 32, justifyContent: 'center', width: 32},
  arrowText: {color: colors.ink, fontSize: 24, lineHeight: 27},
  weekRow: {flexDirection: 'row'},
  weekday: {color: colors.textMuted, fontSize: 10, fontWeight: '700', paddingVertical: 8, textAlign: 'center', width: '14.2857%'},
  sunday: {color: colors.coral},
  grid: {flexDirection: 'row', flexWrap: 'wrap'},
  dayCell: {alignItems: 'center', height: 41, justifyContent: 'center', width: '14.2857%'},
  dayCircle: {alignItems: 'center', borderRadius: 16, height: 32, justifyContent: 'center', width: 32},
  daySelected: {backgroundColor: colors.accent},
  dayToday: {backgroundColor: colors.blueSoft},
  dayText: {color: colors.text, fontSize: 12, fontWeight: '700'},
  dayTextSelected: {color: colors.white},
  dot: {backgroundColor: colors.accent, borderRadius: 2, bottom: 4, height: 4, position: 'absolute', width: 4},
  dotSelected: {backgroundColor: colors.white},
  selectionHeader: {alignItems: 'center', flexDirection: 'row', marginBottom: 11, marginTop: 17},
  selectionTitle: {color: colors.textMuted, fontSize: 11, fontWeight: '800'},
  countPill: {backgroundColor: colors.blueSoft, borderRadius: radius.pill, marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4},
  countText: {color: colors.accent, fontSize: 9, fontWeight: '900'},
  list: {gap: 10},
  empty: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.medium, padding: 29},
  emptyMark: {color: colors.accent, fontSize: 22, fontWeight: '900', letterSpacing: 3},
  emptyTitle: {color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 4},
  emptyBody: {color: colors.textMuted, fontSize: 10, marginTop: 5},
  floatingButton: {alignItems: 'center', alignSelf: 'flex-end', backgroundColor: colors.accent, borderRadius: 26, height: 52, justifyContent: 'center', marginTop: 16, width: 52},
  floatingButtonText: {color: colors.white, fontSize: 29, fontWeight: '400', lineHeight: 31},
  pressed: {opacity: 0.75},
});

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Schedule} from '../domain';
import {colors, radius} from '../theme';
import {formatTime, relativeDay} from '../utils/date';

type Props = {
  schedule: Schedule;
  onToggle?: (schedule: Schedule) => void;
  compact?: boolean;
};

const sourceLabel = {
  DIRECT: '직접 입력',
  SHARE: '공유됨',
  ANDROID_NOTIFICATION: '알림 감지',
};

export function ScheduleCard({schedule, onToggle, compact = false}: Props) {
  const done = schedule.status === 'DONE';
  return (
    <View style={[styles.card, compact && styles.cardCompact, done && styles.cardDone]}>
      <View style={styles.dateRail}>
        <Text style={styles.relative}>{relativeDay(schedule.dueDate)}</Text>
        <Text style={styles.time}>{formatTime(schedule.dueTime)}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[styles.title, done && styles.doneText]}>{schedule.title}</Text>
          {onToggle ? (
            <Pressable
              accessibilityLabel={done ? '완료 취소' : '일정 완료'}
              onPress={() => onToggle(schedule)}
              style={[styles.check, done && styles.checkDone]}>
              <Text style={styles.checkText}>{done ? '✓' : ''}</Text>
            </Pressable>
          ) : null}
        </View>
        {!compact && (schedule.location || schedule.materials.length > 0) ? (
          <View style={styles.metaRow}>
            {schedule.location ? <Text numberOfLines={1} style={styles.meta}>⌖ {schedule.location}</Text> : null}
            {schedule.materials.length > 0 ? <Text numberOfLines={1} style={styles.meta}>◫ {schedule.materials.join(', ')}</Text> : null}
          </View>
        ) : null}
        <View style={styles.sourceRow}>
          <View style={styles.sourceDot} />
          <Text style={styles.source}>{sourceLabel[schedule.sourceType]}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.medium,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 15,
  },
  cardCompact: {paddingVertical: 12},
  cardDone: {opacity: 0.58},
  dateRail: {borderRightColor: colors.line, borderRightWidth: 1, justifyContent: 'center', paddingRight: 13, width: 78},
  relative: {color: colors.ink, fontSize: 13, fontWeight: '800'},
  time: {color: colors.textMuted, fontSize: 11, marginTop: 5},
  content: {flex: 1, paddingLeft: 14},
  titleRow: {alignItems: 'flex-start', flexDirection: 'row', gap: 8},
  title: {color: colors.text, flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 21},
  doneText: {textDecorationLine: 'line-through'},
  check: {alignItems: 'center', borderColor: colors.line, borderRadius: 10, borderWidth: 1.5, height: 22, justifyContent: 'center', width: 22},
  checkDone: {backgroundColor: colors.ink, borderColor: colors.ink},
  checkText: {color: colors.white, fontSize: 13, fontWeight: '900'},
  metaRow: {gap: 4, marginTop: 9},
  meta: {color: colors.textMuted, fontSize: 12},
  sourceRow: {alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 9},
  sourceDot: {backgroundColor: colors.accentDark, borderRadius: 3, height: 6, width: 6},
  source: {color: colors.textMuted, fontSize: 10, fontWeight: '600'},
});

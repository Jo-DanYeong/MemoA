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
  const preparations = schedule.preparations ?? [];
  return (
    <View style={[styles.card, compact && styles.cardCompact, done && styles.cardDone]}>
      <View style={[styles.statusRail, schedule.needsReview && styles.statusRailReview]} />
      {onToggle && !compact ? (
        <Pressable
          accessibilityLabel={done ? '완료 취소' : '일정 완료'}
          onPress={() => onToggle(schedule)}
          style={[styles.check, done && styles.checkDone]}>
          <Text style={styles.checkText}>{done ? '✓' : ''}</Text>
        </Pressable>
      ) : null}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text numberOfLines={2} style={[styles.title, done && styles.doneText]}>{schedule.title}</Text>
          {schedule.needsReview ? <View style={styles.reviewBadge}><Text style={styles.reviewBadgeText}>확인 필요</Text></View> : null}
        </View>
        <Text style={styles.dateTime}>
          {relativeDay(schedule.dueDate)} · {formatTime(schedule.dueTime)}{compact && schedule.location ? ` · ${schedule.location}` : ''}
        </Text>
        {!compact && schedule.details ? <Text numberOfLines={2} style={styles.details}>{schedule.details}</Text> : null}
        {!compact && (schedule.location || preparations.length > 0) ? (
          <View style={styles.metaRow}>
            {schedule.location ? <Text numberOfLines={1} style={styles.meta}>⌖ {schedule.location}</Text> : null}
            {preparations.length > 0 ? <Text numberOfLines={1} style={styles.meta}>□ {preparations.join(', ')}</Text> : null}
          </View>
        ) : null}
        {!compact ? <View style={styles.sourceRow}>
          <View style={[styles.sourceDot, schedule.sourceType === 'ANDROID_NOTIFICATION' && styles.sourceDotNotification]} />
          <Text style={styles.source}>{sourceLabel[schedule.sourceType]}</Text>
        </View> : null}
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
    overflow: 'hidden',
    paddingBottom: 15,
    paddingRight: 15,
    paddingTop: 15,
  },
  cardCompact: {minHeight: 64, paddingVertical: 12},
  cardDone: {opacity: 0.58},
  statusRail: {alignSelf: 'stretch', backgroundColor: colors.accent, borderRadius: 3, marginLeft: 9, marginRight: 12, width: 4},
  statusRailReview: {backgroundColor: colors.amber},
  check: {alignItems: 'center', borderColor: colors.line, borderRadius: 10, borderWidth: 1.5, height: 21, justifyContent: 'center', marginRight: 11, marginTop: 1, width: 21},
  checkDone: {backgroundColor: colors.accent, borderColor: colors.accent},
  checkText: {color: colors.white, fontSize: 12, fontWeight: '900'},
  content: {flex: 1},
  titleRow: {alignItems: 'center', flexDirection: 'row', gap: 8},
  title: {color: colors.text, flex: 1, fontSize: 13, fontWeight: '900', lineHeight: 18},
  doneText: {textDecorationLine: 'line-through'},
  reviewBadge: {backgroundColor: colors.amberSoft, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 4},
  reviewBadgeText: {color: colors.amber, fontSize: 8, fontWeight: '800'},
  dateTime: {color: colors.textMuted, fontSize: 10, fontWeight: '600', marginTop: 5},
  details: {color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7},
  metaRow: {gap: 4, marginTop: 7},
  meta: {color: colors.textMuted, fontSize: 10, fontWeight: '600'},
  sourceRow: {alignItems: 'center', flexDirection: 'row', gap: 5, marginTop: 9},
  sourceDot: {backgroundColor: colors.accent, borderRadius: 3, height: 6, width: 6},
  sourceDotNotification: {backgroundColor: colors.green},
  source: {color: colors.textMuted, fontSize: 9, fontWeight: '600'},
});

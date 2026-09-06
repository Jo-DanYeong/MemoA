import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {AnalysisResult} from '../domain';
import {colors, radius} from '../theme';
import {addDaysISO} from '../utils/date';

type Props = {
  initial: AnalysisResult;
  usedLocalFallback: boolean;
  onBack: () => void;
  onSave: (result: AnalysisResult) => Promise<void>;
};

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
};

function Field({label, value, onChangeText, placeholder, multiline}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA39F"
        style={[styles.fieldInput, multiline && styles.multiline]}
        value={value}
      />
    </View>
  );
}

export function ReviewScreen({initial, usedLocalFallback, onBack, onSave}: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initial.title);
  const [details, setDetails] = useState(initial.details);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [dueTime, setDueTime] = useState(initial.dueTime ?? '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [materials, setMaterials] = useState(initial.materials.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const confidence = useMemo(() => Math.round(initial.confidence * 100), [initial.confidence]);

  const save = async () => {
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setError('일정 이름과 날짜 형식(YYYY-MM-DD)을 확인해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave({
        ...initial,
        title: title.trim(),
        details: details.trim(),
        dueDate,
        dueTime: dueTime.trim() || null,
        location: location.trim() || null,
        materials: materials.split(',').map(item => item.trim()).filter(Boolean),
        needsReview: false,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '일정을 저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 28)}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="뒤로" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>AI ANALYSIS</Text>
            <Text style={styles.title}>분석 결과 확인</Text>
          </View>
          <View style={styles.confidence}><Text style={styles.confidenceValue}>{confidence}%</Text><Text style={styles.confidenceLabel}>신뢰도</Text></View>
        </View>

        <View style={[styles.notice, usedLocalFallback && styles.noticeFallback]}>
          <Text style={styles.noticeIcon}>{usedLocalFallback ? '⌁' : '✦'}</Text>
          <Text style={styles.noticeText}>{usedLocalFallback ? '서버 연결 없이 기본 분석을 사용했어요. 저장 전 내용을 확인해주세요.' : 'AI가 찾은 내용이에요. 틀린 부분은 바로 수정할 수 있어요.'}</Text>
        </View>

        <View style={styles.formCard}>
          <Field label="해야 할 일" onChangeText={setTitle} value={title} />
          <View style={styles.divider} />
          <Field label="날짜" onChangeText={setDueDate} placeholder="YYYY-MM-DD" value={dueDate} />
          <View style={styles.quickDates}>
            <Pressable onPress={() => setDueDate(addDaysISO(0))} style={styles.quickChip}><Text style={styles.quickText}>오늘</Text></Pressable>
            <Pressable onPress={() => setDueDate(addDaysISO(1))} style={styles.quickChip}><Text style={styles.quickText}>내일</Text></Pressable>
            <Pressable onPress={() => setDueDate(addDaysISO(7))} style={styles.quickChip}><Text style={styles.quickText}>일주일 뒤</Text></Pressable>
          </View>
          <View style={styles.divider} />
          <Field label="시간" onChangeText={setDueTime} placeholder="예: 15:30 (선택)" value={dueTime} />
          <View style={styles.divider} />
          <Field label="장소" onChangeText={setLocation} placeholder="장소 없음" value={location} />
          <View style={styles.divider} />
          <Field label="준비물" onChangeText={setMaterials} placeholder="쉼표로 구분해주세요" value={materials} />
          <View style={styles.divider} />
          <Field label="메모" multiline onChangeText={setDetails} value={details} />
        </View>

        <View style={styles.reminderCard}>
          <View style={styles.reminderIcon}><Text style={styles.reminderIconText}>◷</Text></View>
          <View style={styles.reminderCopy}><Text style={styles.reminderTitle}>기본 알림 예약</Text><Text style={styles.reminderBody}>일정 1시간 전으로 서버에 저장해요</Text></View>
          <View style={styles.toggle}><View style={styles.toggleKnob} /></View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={busy} onPress={save} style={({pressed}) => [styles.save, pressed && styles.pressed, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>이대로 일정에 저장하기</Text>}
        </Pressable>
        <Text style={styles.hint}>저장 후에도 일정 화면에서 완료 여부를 바꿀 수 있어요.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {backgroundColor: colors.background, flex: 1},
  page: {backgroundColor: colors.background, paddingHorizontal: 20},
  header: {alignItems: 'center', flexDirection: 'row'},
  back: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 19, height: 38, justifyContent: 'center', width: 38},
  backText: {color: colors.ink, fontSize: 29, lineHeight: 31, marginTop: -2},
  headerCopy: {flex: 1, paddingLeft: 12},
  eyebrow: {color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2},
  title: {color: colors.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.6, marginTop: 2},
  confidence: {alignItems: 'center', backgroundColor: colors.mint, borderRadius: 18, minWidth: 60, paddingHorizontal: 10, paddingVertical: 7},
  confidenceValue: {color: colors.ink, fontSize: 13, fontWeight: '900'},
  confidenceLabel: {color: colors.textMuted, fontSize: 8, marginTop: 1},
  notice: {alignItems: 'center', backgroundColor: colors.mint, borderRadius: radius.medium, flexDirection: 'row', gap: 10, marginTop: 18, padding: 13},
  noticeFallback: {backgroundColor: colors.peach},
  noticeIcon: {color: colors.ink, fontSize: 17, fontWeight: '900'},
  noticeText: {color: colors.text, flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 17},
  formCard: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.large, borderWidth: 1, marginTop: 12, paddingHorizontal: 17},
  field: {paddingVertical: 14},
  fieldLabel: {color: colors.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 7},
  fieldInput: {color: colors.text, fontSize: 15, fontWeight: '700', minHeight: 24, padding: 0},
  multiline: {fontSize: 13, fontWeight: '500', lineHeight: 20, minHeight: 58, textAlignVertical: 'top'},
  divider: {backgroundColor: colors.line, height: StyleSheet.hairlineWidth},
  quickDates: {flexDirection: 'row', gap: 6, marginBottom: 13, marginTop: -5},
  quickChip: {backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6},
  quickText: {color: colors.textMuted, fontSize: 10, fontWeight: '700'},
  reminderCard: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.medium, flexDirection: 'row', marginTop: 12, padding: 14},
  reminderIcon: {alignItems: 'center', backgroundColor: colors.peach, borderRadius: 17, height: 34, justifyContent: 'center', width: 34},
  reminderIconText: {color: colors.ink, fontSize: 17, fontWeight: '900'},
  reminderCopy: {flex: 1, paddingHorizontal: 11},
  reminderTitle: {color: colors.text, fontSize: 12, fontWeight: '800'},
  reminderBody: {color: colors.textMuted, fontSize: 9, marginTop: 3},
  toggle: {backgroundColor: colors.ink, borderRadius: 12, height: 24, padding: 3, width: 43},
  toggleKnob: {alignSelf: 'flex-end', backgroundColor: colors.white, borderRadius: 9, height: 18, width: 18},
  error: {color: colors.danger, fontSize: 12, marginTop: 11, paddingHorizontal: 3},
  save: {alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.medium, height: 56, justifyContent: 'center', marginTop: 14},
  saveText: {color: colors.white, fontSize: 15, fontWeight: '900'},
  hint: {color: colors.textMuted, fontSize: 10, marginTop: 10, textAlign: 'center'},
  pressed: {opacity: 0.77},
  disabled: {opacity: 0.6},
});

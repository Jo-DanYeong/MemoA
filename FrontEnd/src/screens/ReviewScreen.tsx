import React, {useState} from 'react';
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

type Props = {
  initial: AnalysisResult;
  originalMessage: string;
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
  maxLength?: number;
  needsConfirmation?: boolean;
};

function Field({label, value, onChangeText, placeholder, multiline, maxLength, needsConfirmation}: FieldProps) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <View style={styles.labelRow}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI 추출</Text></View>
          {needsConfirmation ? <View style={styles.confirmBadge}><Text style={styles.confirmBadgeText}>확인 필요</Text></View> : null}
        </View>
        <Text style={styles.editIcon}>⌕</Text>
      </View>
      <TextInput
        maxLength={maxLength}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.disabledText}
        style={[styles.fieldInput, multiline && styles.multiline]}
        value={value}
      />
    </View>
  );
}

export function ReviewScreen({initial, originalMessage, usedLocalFallback, onBack, onSave}: Props) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState(initial.title);
  const [details, setDetails] = useState(initial.details ?? '');
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [dueTime, setDueTime] = useState(initial.dueTime?.slice(0, 5) ?? '');
  const [location, setLocation] = useState(initial.location ?? '');
  const [preparations, setPreparations] = useState((initial.preparations ?? []).join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const normalizedTime = dueTime.trim();
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || (normalizedTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizedTime))) {
      setError('일정 제목, 날짜(YYYY-MM-DD), 시간(HH:mm) 형식을 확인해 주세요.');
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
        dueTime: normalizedTime || null,
        location: location.trim() || null,
        preparations: preparations.split(',').map(item => item.trim()).filter(Boolean),
        needsReview: false,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '일정을 저장하지 못했습니다.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.header, {paddingTop: Math.max(insets.top, 10)}]}>
        <Pressable accessibilityLabel="뒤로" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
        <Text style={styles.headerTitle}>분석 결과</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.originalCard}>
          <Text style={styles.originalLabel}>원본 메시지</Text>
          <Text numberOfLines={2} style={styles.originalText}>{originalMessage || '직접 입력한 메시지'}</Text>
        </View>

        {usedLocalFallback ? (
          <View style={styles.fallback}><Text style={styles.fallbackText}>서버 연결 없이 기본 분석을 사용했어요. 아래 내용을 꼭 확인해 주세요.</Text></View>
        ) : null}

        <View style={styles.formList}>
          <Field label="일정 제목" maxLength={80} onChangeText={setTitle} value={title} />
          <Field label="날짜" needsConfirmation={initial.needsReview} onChangeText={setDueDate} placeholder="YYYY-MM-DD" value={dueDate} />
          <Field label="시간" maxLength={5} onChangeText={setDueTime} placeholder="HH:mm" value={dueTime} />
          <Field label="장소" maxLength={180} onChangeText={setLocation} placeholder="장소 미정" value={location} />
          <Field label="준비 사항" maxLength={1000} multiline onChangeText={setPreparations} placeholder="예: 발표 자료, 노트북" value={preparations} />
          <Field label="상세 내용" maxLength={1000} multiline onChangeText={setDetails} placeholder="일정에 필요한 보충 설명" value={details} />
        </View>

        <View style={styles.reminderCard}>
          <View>
            <Text style={styles.reminderLabel}>알림 설정</Text>
            <Text style={styles.reminderValue}>30분 전</Text>
          </View>
          <Text style={styles.reminderArrow}>⌄</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.actionRow, {paddingBottom: Math.max(insets.bottom, 12)}]}>
        <Pressable disabled={busy} onPress={onBack} style={({pressed}) => [styles.retry, pressed && styles.pressed]}>
          <Text style={styles.retryText}>다시 분석</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={save} style={({pressed}) => [styles.save, pressed && styles.pressed, busy && styles.disabled]}>
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>일정 저장</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {backgroundColor: colors.background, flex: 1},
  header: {alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 9},
  back: {alignItems: 'center', height: 40, justifyContent: 'center', width: 40},
  backText: {color: colors.ink, fontSize: 31, lineHeight: 32, marginTop: -3},
  headerTitle: {color: colors.ink, flex: 1, fontSize: 17, fontWeight: '900'},
  headerSpacer: {width: 40},
  page: {padding: 12, paddingBottom: 18},
  originalCard: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, padding: 12},
  originalLabel: {color: colors.textMuted, fontSize: 9, fontWeight: '800'},
  originalText: {color: colors.text, fontSize: 10, lineHeight: 16, marginTop: 5},
  fallback: {backgroundColor: colors.amberSoft, borderRadius: radius.small, marginTop: 8, padding: 10},
  fallbackText: {color: colors.amber, fontSize: 9, fontWeight: '700', lineHeight: 14},
  formList: {gap: 8, marginTop: 10},
  field: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10},
  fieldHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  labelRow: {alignItems: 'center', flexDirection: 'row', gap: 5},
  fieldLabel: {color: colors.textMuted, fontSize: 9, fontWeight: '800'},
  aiBadge: {backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 3},
  aiBadgeText: {color: colors.accent, fontSize: 7, fontWeight: '900'},
  confirmBadge: {backgroundColor: colors.amberSoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 3},
  confirmBadgeText: {color: colors.amber, fontSize: 7, fontWeight: '900'},
  editIcon: {color: colors.textMuted, fontSize: 13},
  fieldInput: {color: colors.text, fontSize: 13, fontWeight: '800', minHeight: 25, padding: 0, paddingTop: 5},
  multiline: {fontSize: 11, fontWeight: '500', lineHeight: 17, minHeight: 42, textAlignVertical: 'top'},
  reminderCard: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, padding: 12},
  reminderLabel: {color: colors.textMuted, fontSize: 9, fontWeight: '800'},
  reminderValue: {color: colors.text, fontSize: 12, fontWeight: '900', marginTop: 5},
  reminderArrow: {color: colors.text, fontSize: 18},
  error: {color: colors.danger, fontSize: 10, marginTop: 9},
  actionRow: {backgroundColor: colors.surface, borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10},
  retry: {alignItems: 'center', borderColor: colors.accent, borderRadius: radius.pill, borderWidth: 1, flex: 1, height: 46, justifyContent: 'center'},
  retryText: {color: colors.accent, fontSize: 12, fontWeight: '900'},
  save: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.pill, flex: 1.2, height: 46, justifyContent: 'center'},
  saveText: {color: colors.white, fontSize: 12, fontWeight: '900'},
  pressed: {opacity: 0.72},
  disabled: {opacity: 0.6},
});

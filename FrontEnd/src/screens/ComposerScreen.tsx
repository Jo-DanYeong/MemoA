import React, {useEffect, useState} from 'react';
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

import {AnalysisResult, SourceType} from '../domain';
import {colors, radius} from '../theme';

type Props = {
  initialMessage?: string;
  initialSource?: SourceType;
  onAnalyze: (message: string, source: SourceType) => Promise<AnalysisResult>;
  onAnalyzed: (result: AnalysisResult) => void;
};

const EXAMPLE = '금요일 오후 3시까지 과학 수행평가 보고서 제출. 준비물: 실험 노트, USB';

export function ComposerScreen({initialMessage = '', initialSource = 'DIRECT', onAnalyze, onAnalyzed}: Props) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState(initialMessage);
  const [source, setSource] = useState<SourceType>(initialSource);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
      setSource(initialSource);
    }
  }, [initialMessage, initialSource]);

  const analyze = async () => {
    if (message.trim().length < 3) {
      setError('분석할 메시지를 3자 이상 입력해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onAnalyzed(await onAnalyze(message.trim(), source));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '메시지를 분석하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 20)}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>NEW CAPTURE</Text>
            <Text style={styles.title}>메시지에서 일정 찾기</Text>
          </View>
          <View style={styles.spark}><Text style={styles.sparkText}>✦</Text></View>
        </View>
        <Text style={styles.description}>카카오톡, 문자, 이메일에서 받은 내용을 그대로 붙여 넣어도 괜찮아요.</Text>

        <View style={styles.sourceRow}>
          <Pressable onPress={() => setSource('DIRECT')} style={[styles.chip, source === 'DIRECT' && styles.chipActive]}>
            <Text style={[styles.chipText, source === 'DIRECT' && styles.chipTextActive]}>직접 입력</Text>
          </Pressable>
          <Pressable onPress={() => setSource('SHARE')} style={[styles.chip, source === 'SHARE' && styles.chipActive]}>
            <Text style={[styles.chipText, source === 'SHARE' && styles.chipTextActive]}>공유한 메시지</Text>
          </Pressable>
          {Platform.OS === 'android' ? (
            <Pressable onPress={() => setSource('ANDROID_NOTIFICATION')} style={[styles.chip, source === 'ANDROID_NOTIFICATION' && styles.chipActive]}>
              <Text style={[styles.chipText, source === 'ANDROID_NOTIFICATION' && styles.chipTextActive]}>감지된 알림</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.editor}>
          <View style={styles.editorTop}>
            <Text style={styles.editorLabel}>메시지 내용</Text>
            <Text style={styles.count}>{message.length} / 2,000</Text>
          </View>
          <TextInput
            maxLength={2000}
            multiline
            onChangeText={setMessage}
            placeholder={'예) 다음 주 화요일 오전 10시 팀 회의가 있어요.\n장소: 3층 회의실, 준비물: 기획안'}
            placeholderTextColor="#9AA39F"
            style={styles.input}
            textAlignVertical="top"
            value={message}
          />
          <View style={styles.editorActions}>
            <Pressable onPress={() => setMessage('')} style={styles.clearButton}><Text style={styles.clearText}>내용 지우기</Text></Pressable>
            <Pressable onPress={() => setMessage(EXAMPLE)} style={styles.exampleButton}><Text style={styles.exampleText}>예시 넣기</Text></Pressable>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={busy} onPress={analyze} style={({pressed}) => [styles.analyze, pressed && styles.pressed, busy && styles.disabled]}>
          {busy ? (
            <View style={styles.loadingRow}><ActivityIndicator color={colors.ink} /><Text style={styles.analyzeText}>중요한 내용을 찾고 있어요…</Text></View>
          ) : (
            <Text style={styles.analyzeText}>✦  AI로 일정 정리하기</Text>
          )}
        </Pressable>

        <View style={styles.privacyCard}>
          <View style={styles.shield}><Text style={styles.shieldText}>✓</Text></View>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>메시지는 필요한 순간에만 분석해요</Text>
            <Text style={styles.privacyBody}>일정으로 저장할 때 원문은 제외하고 정리된 정보만 보관합니다.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {backgroundColor: colors.background, flex: 1},
  page: {backgroundColor: colors.background, paddingBottom: 34, paddingHorizontal: 20},
  titleRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  eyebrow: {color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4},
  title: {color: colors.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.8, marginTop: 4},
  spark: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: 22, height: 44, justifyContent: 'center', width: 44},
  sparkText: {color: colors.ink, fontSize: 20, fontWeight: '900'},
  description: {color: colors.textMuted, fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 310},
  sourceRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 21},
  chip: {backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8},
  chipActive: {backgroundColor: colors.ink},
  chipText: {color: colors.textMuted, fontSize: 11, fontWeight: '700'},
  chipTextActive: {color: colors.white},
  editor: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.large, borderWidth: 1, marginTop: 14, padding: 17},
  editorTop: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  editorLabel: {color: colors.ink, fontSize: 13, fontWeight: '900'},
  count: {color: colors.textMuted, fontSize: 10},
  input: {color: colors.text, fontSize: 16, lineHeight: 25, minHeight: 205, paddingHorizontal: 0, paddingTop: 18},
  editorActions: {alignItems: 'center', borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12},
  clearButton: {paddingVertical: 5},
  clearText: {color: colors.textMuted, fontSize: 11, fontWeight: '700'},
  exampleButton: {backgroundColor: colors.mint, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7},
  exampleText: {color: colors.ink, fontSize: 11, fontWeight: '800'},
  error: {color: colors.danger, fontSize: 12, marginTop: 10, paddingHorizontal: 3},
  analyze: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.medium, height: 57, justifyContent: 'center', marginTop: 14},
  analyzeText: {color: colors.ink, fontSize: 15, fontWeight: '900'},
  loadingRow: {alignItems: 'center', flexDirection: 'row', gap: 10},
  privacyCard: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.medium, flexDirection: 'row', gap: 12, marginTop: 14, padding: 14},
  shield: {alignItems: 'center', backgroundColor: colors.surface, borderRadius: 15, height: 30, justifyContent: 'center', width: 30},
  shieldText: {color: colors.ink, fontSize: 13, fontWeight: '900'},
  privacyCopy: {flex: 1},
  privacyTitle: {color: colors.text, fontSize: 11, fontWeight: '800'},
  privacyBody: {color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3},
  pressed: {opacity: 0.76},
  disabled: {opacity: 0.6},
});

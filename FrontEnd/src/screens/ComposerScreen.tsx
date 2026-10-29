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
  onBack: () => void;
};

const EXAMPLE = '내일 오후 3시까지 과제 제출하고, 준비물은 발표 자료와 노트북이야.';

export function ComposerScreen({initialMessage = '', initialSource = 'DIRECT', onAnalyze, onAnalyzed, onBack}: Props) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState(initialMessage);
  const [source, setSource] = useState<SourceType>(initialSource);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMessage(initialMessage);
    setSource(initialSource);
  }, [initialMessage, initialSource]);

  const analyze = async () => {
    if (message.trim().length < 3) {
      setError('분석할 메시지를 3자 이상 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onAnalyzed(await onAnalyze(message.trim(), source));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '메시지를 분석하지 못했습니다.');
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <View style={[styles.loadingPage, {paddingTop: Math.max(insets.top, 20)}]}>
        <View style={styles.loadingOrb}><ActivityIndicator color={colors.white} size="large" /></View>
        <Text style={styles.loadingTitle}>해야 할 일과 일정 정보를 찾고 있어요</Text>
        <Text style={styles.loadingBody}>메시지 속 핵심 행동과 날짜·장소를 정리하고 있습니다.</Text>
        <View style={styles.loadingSteps}>
          <Text style={styles.loadingDone}>✓  메시지 읽는 중…</Text>
          <Text style={styles.loadingActive}>●  일정 추출 중…</Text>
          <Text style={styles.loadingPending}>   결과 정리 중…</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 12)}]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="뒤로" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <Text style={styles.title}>메시지 입력</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <Text style={styles.editorLabel}>메시지 내용</Text>
            <Pressable onPress={() => setMessage(EXAMPLE)} style={styles.pasteButton}>
              <Text style={styles.pasteText}>▣ 예시 넣기</Text>
            </Pressable>
          </View>
          <TextInput
            maxLength={2000}
            multiline
            onChangeText={setMessage}
            placeholder="일정이 포함된 메시지를 붙여 넣거나 입력해 주세요"
            placeholderTextColor={colors.disabledText}
            style={styles.input}
            textAlignVertical="top"
            value={message}
          />
          <Text style={styles.count}>{message.length} / 2,000</Text>
        </View>

        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>입력 예시</Text>
          <Text style={styles.exampleBody}>“내일 오후 3시까지 과제 제출하고, 준비물은 발표 자료와 노트북이야.”</Text>
        </View>

        <View style={styles.privacyRow}>
          <Text style={styles.shield}>♢</Text>
          <Text style={styles.privacyText}>개인정보가 포함된 메시지는 일정 분석에 필요한 범위에서만 처리됩니다.</Text>
        </View>

        {source !== 'DIRECT' ? <Text style={styles.sourceText}>공유된 메시지를 불러왔습니다.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={analyze} style={({pressed}) => [styles.analyze, pressed && styles.pressed]}>
          <Text style={styles.analyzeText}>✣ AI로 분석하기</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {backgroundColor: colors.background, flex: 1},
  page: {backgroundColor: colors.background, flexGrow: 1, paddingBottom: 28, paddingHorizontal: 16},
  header: {alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', marginHorizontal: -16, minHeight: 54, paddingHorizontal: 12},
  back: {alignItems: 'center', height: 40, justifyContent: 'center', width: 40},
  backText: {color: colors.ink, fontSize: 31, lineHeight: 32, marginTop: -3},
  title: {color: colors.ink, flex: 1, fontSize: 17, fontWeight: '900'},
  headerSpacer: {width: 40},
  editor: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, marginTop: 14, padding: 13},
  editorHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  editorLabel: {color: colors.textMuted, fontSize: 10, fontWeight: '800'},
  pasteButton: {backgroundColor: colors.blueSoft, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6},
  pasteText: {color: colors.accent, fontSize: 9, fontWeight: '900'},
  input: {color: colors.text, fontSize: 14, lineHeight: 22, minHeight: 160, paddingHorizontal: 0, paddingTop: 14},
  count: {alignSelf: 'flex-end', color: colors.disabledText, fontSize: 9},
  exampleCard: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, marginTop: 12, padding: 13},
  exampleTitle: {color: colors.textMuted, fontSize: 10, fontWeight: '800'},
  exampleBody: {color: colors.text, fontSize: 11, lineHeight: 18, marginTop: 7},
  privacyRow: {alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 13, paddingHorizontal: 3},
  shield: {color: colors.textMuted, fontSize: 15},
  privacyText: {color: colors.textMuted, flex: 1, fontSize: 9, lineHeight: 15},
  sourceText: {color: colors.accent, fontSize: 10, fontWeight: '700', marginTop: 10},
  error: {color: colors.danger, fontSize: 11, marginTop: 10},
  analyze: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.pill, justifyContent: 'center', marginTop: 'auto', minHeight: 50},
  analyzeText: {color: colors.white, fontSize: 13, fontWeight: '900'},
  loadingPage: {alignItems: 'center', backgroundColor: colors.blueSoft, flex: 1, justifyContent: 'center', paddingHorizontal: 30},
  loadingOrb: {alignItems: 'center', backgroundColor: colors.accent, borderColor: '#CFE1FF', borderRadius: 38, borderWidth: 10, height: 76, justifyContent: 'center', width: 76},
  loadingTitle: {color: colors.ink, fontSize: 17, fontWeight: '900', marginTop: 42, textAlign: 'center'},
  loadingBody: {color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 8, textAlign: 'center'},
  loadingSteps: {gap: 10, marginTop: 30, minWidth: 170},
  loadingDone: {color: '#7EA5D9', fontSize: 11, fontWeight: '700'},
  loadingActive: {color: colors.accent, fontSize: 11, fontWeight: '900'},
  loadingPending: {color: colors.disabledText, fontSize: 11, fontWeight: '700'},
  pressed: {opacity: 0.72},
});

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

import {colors, radius} from '../theme';

type Props = {
  onAuthenticate: (mode: 'login' | 'signup', values: {name: string; email: string; password: string}) => Promise<void>;
  onGuest: () => void;
};

export function AuthScreen({onAuthenticate, onGuest}: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || password.length < 8 || (mode === 'signup' && !name.trim())) {
      setError('이름과 이메일을 확인하고 비밀번호를 8자 이상 입력해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onAuthenticate(mode, {name: name.trim(), email: email.trim(), password});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '로그인할 수 없습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView
        contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 28)}]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoMark}>M</Text></View>
          <Text style={styles.brand}>MemoA</Text>
        </View>

        <View style={styles.illustration}>
          <View style={styles.messageBack} />
          <View style={styles.messageFront}>
            <View style={styles.lineLong} />
            <View style={styles.lineShort} />
            <View style={styles.spark}><Text style={styles.sparkText}>✦</Text></View>
          </View>
        </View>

        <Text style={styles.heading}>메시지는 그대로,{`\n`}일정은 알아서.</Text>
        <Text style={styles.subheading}>받은 메시지를 붙여 넣으면 해야 할 일과 날짜, 준비물을 한 번에 정리해드려요.</Text>

        <View style={styles.segment}>
          <Pressable onPress={() => {setMode('login'); setError('');}} style={[styles.segmentButton, mode === 'login' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>로그인</Text>
          </Pressable>
          <Pressable onPress={() => {setMode('signup'); setError('');}} style={[styles.segmentButton, mode === 'signup' && styles.segmentActive]}>
            <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>회원가입</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {mode === 'signup' ? (
            <TextInput
              autoComplete="name"
              onChangeText={setName}
              placeholder="이름"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={name}
            />
          ) : null}
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="이메일"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder="비밀번호 (8자 이상)"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={busy} onPress={submit} style={({pressed}) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{mode === 'login' ? '로그인하기' : '계정 만들기'}</Text>}
          </Pressable>
          <Pressable disabled={busy} onPress={onGuest} style={styles.guest}>
            <Text style={styles.guestText}>서버 없이 먼저 둘러보기 →</Text>
          </Pressable>
        </View>
        <Text style={styles.privacy}>MemoA는 분석에 필요한 메시지만 처리하며 원문을 일정에 저장하지 않습니다.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {backgroundColor: colors.background, flex: 1},
  page: {flexGrow: 1, paddingHorizontal: 26},
  brandRow: {alignItems: 'center', flexDirection: 'row', gap: 10},
  logo: {alignItems: 'center', backgroundColor: colors.ink, borderRadius: 12, height: 38, justifyContent: 'center', width: 38},
  logoMark: {color: colors.accent, fontSize: 19, fontWeight: '900'},
  brand: {color: colors.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.5},
  illustration: {height: 145, marginTop: 20, position: 'relative'},
  messageBack: {backgroundColor: colors.mint, borderRadius: 25, height: 86, left: '22%', position: 'absolute', top: 15, transform: [{rotate: '-7deg'}], width: '58%'},
  messageFront: {backgroundColor: colors.ink, borderRadius: 25, height: 92, left: '18%', padding: 24, position: 'absolute', top: 32, transform: [{rotate: '4deg'}], width: '66%'},
  lineLong: {backgroundColor: colors.white, borderRadius: 4, height: 7, opacity: 0.92, width: '78%'},
  lineShort: {backgroundColor: colors.white, borderRadius: 4, height: 7, marginTop: 12, opacity: 0.45, width: '48%'},
  spark: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: 19, bottom: -17, height: 38, justifyContent: 'center', position: 'absolute', right: -12, width: 38},
  sparkText: {color: colors.ink, fontSize: 19, fontWeight: '900'},
  heading: {color: colors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1.2, lineHeight: 40},
  subheading: {color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 10},
  segment: {backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, flexDirection: 'row', marginTop: 22, padding: 4},
  segmentButton: {alignItems: 'center', borderRadius: radius.pill, flex: 1, paddingVertical: 10},
  segmentActive: {backgroundColor: colors.surface},
  segmentText: {color: colors.textMuted, fontSize: 13, fontWeight: '700'},
  segmentTextActive: {color: colors.ink, fontWeight: '900'},
  form: {gap: 10, marginTop: 14},
  input: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, color: colors.text, fontSize: 15, height: 52, paddingHorizontal: 16},
  error: {color: colors.danger, fontSize: 12, lineHeight: 18, paddingHorizontal: 3},
  primary: {alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.medium, height: 54, justifyContent: 'center', marginTop: 2},
  primaryText: {color: colors.white, fontSize: 15, fontWeight: '900'},
  guest: {alignItems: 'center', paddingVertical: 10},
  guestText: {color: colors.ink, fontSize: 13, fontWeight: '800'},
  privacy: {color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 'auto', paddingTop: 20, textAlign: 'center'},
  pressed: {opacity: 0.75},
  disabled: {opacity: 0.6},
});

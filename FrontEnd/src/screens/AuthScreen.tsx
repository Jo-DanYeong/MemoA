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
      setError('이름과 이메일을 확인하고 비밀번호를 8자 이상 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onAuthenticate(mode, {name: name.trim(), email: email.trim(), password});
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '로그인할 수 없습니다.');
      setBusy(false);
    }
  };

  const changeMode = () => {
    setMode(current => current === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 54), paddingBottom: Math.max(insets.bottom, 24)}]} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoMark}>✣</Text></View>
          <Text style={styles.brand}>Memo<Text style={styles.brandAccent}>A</Text></Text>
        </View>
        <Text style={styles.subheading}>{mode === 'login' ? '분석을 시작하려면 로그인해 주세요' : 'MemoA에서 일정을 간편하게 관리해 보세요'}</Text>

        <View style={styles.form}>
          {mode === 'signup' ? (
            <View>
              <Text style={styles.label}>이름</Text>
              <TextInput autoComplete="name" onChangeText={setName} placeholder="이름을 입력해 주세요" placeholderTextColor={colors.disabledText} style={styles.input} value={name} />
            </View>
          ) : null}
          <View>
            <Text style={[styles.label, error && styles.errorLabel]}>이메일</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={colors.disabledText}
              style={[styles.input, error && styles.inputError]}
              value={email}
            />
          </View>
          <View>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChangeText={setPassword}
              onSubmitEditing={submit}
              placeholder="8자 이상 입력해 주세요"
              placeholderTextColor={colors.disabledText}
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={busy} onPress={submit} style={({pressed}) => [styles.primary, pressed && styles.pressed, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>{mode === 'login' ? '로그인' : '회원가입'}</Text>}
          </Pressable>
          <Pressable disabled={busy} onPress={changeMode} style={styles.linkButton}>
            <Text style={styles.linkText}>{mode === 'login' ? '계정이 없으신가요?  회원가입' : '이미 계정이 있으신가요?  로그인'}</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={onGuest} style={styles.guest}>
            <Text style={styles.guestText}>체험 모드로 둘러보기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {backgroundColor: colors.background, flex: 1},
  page: {flexGrow: 1, paddingHorizontal: 28},
  brandRow: {alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 36},
  logo: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: 11, height: 34, justifyContent: 'center', marginRight: 6, width: 34},
  logoMark: {color: colors.white, fontSize: 17, fontWeight: '900'},
  brand: {color: colors.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.7},
  brandAccent: {color: colors.accent},
  subheading: {color: colors.textMuted, fontSize: 11, marginTop: 17, textAlign: 'center'},
  form: {gap: 13, marginTop: 52},
  label: {color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 7},
  errorLabel: {color: colors.danger},
  input: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.small, borderWidth: 1, color: colors.text, fontSize: 13, height: 50, paddingHorizontal: 14},
  inputError: {borderColor: colors.danger},
  error: {color: colors.danger, fontSize: 10, lineHeight: 15, marginTop: -6},
  primary: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: radius.pill, height: 49, justifyContent: 'center', marginTop: 10},
  primaryText: {color: colors.white, fontSize: 13, fontWeight: '900'},
  linkButton: {alignItems: 'center', paddingVertical: 3},
  linkText: {color: colors.text, fontSize: 10, textDecorationLine: 'underline'},
  guest: {alignItems: 'center', paddingVertical: 5},
  guestText: {color: colors.accent, fontSize: 10, fontWeight: '800'},
  pressed: {opacity: 0.72},
  disabled: {opacity: 0.6},
});

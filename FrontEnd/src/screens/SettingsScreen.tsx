import React, {useCallback, useEffect, useState} from 'react';
import {AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {UserSession} from '../domain';
import {notificationAccessGranted, notificationCaptureAvailable, openNotificationAccessSettings} from '../native/capture';
import {colors, radius} from '../theme';

type Props = {
  session: UserSession;
  onLogout: () => void;
};

type RowProps = {
  icon: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  onPress?: () => void;
};

function SettingRow({icon, title, subtitle, right, onPress}: RowProps) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({pressed}) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowIcon}><Text style={styles.rowIconText}>{icon}</Text></View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </Pressable>
  );
}

export function SettingsScreen({session, onLogout}: Props) {
  const insets = useSafeAreaInsets();
  const [access, setAccess] = useState(false);
  const hasNativeCapture = notificationCaptureAvailable();

  const refreshAccess = useCallback(async () => {
    setAccess(await notificationAccessGranted());
  }, []);

  useEffect(() => {
    refreshAccess();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshAccess();
      }
    });
    return () => subscription.remove();
  }, [refreshAccess]);

  return (
    <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 18)}]} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>SETTINGS</Text>
      <Text style={styles.title}>MemoA 설정</Text>

      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{session.displayName.slice(0, 1)}</Text></View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{session.displayName}</Text>
          <Text style={styles.email}>{session.guest ? '체험 모드 · 기기에만 임시 저장' : session.email}</Text>
        </View>
        <View style={styles.plan}><Text style={styles.planText}>{session.guest ? 'GUEST' : 'BASIC'}</Text></View>
      </View>

      <Text style={styles.sectionLabel}>메시지 가져오기</Text>
      <View style={styles.group}>
        {Platform.OS === 'android' && hasNativeCapture ? (
          <SettingRow
            icon="◉"
            onPress={openNotificationAccessSettings}
            right={<View style={[styles.statusPill, access && styles.statusOn]}><Text style={[styles.statusText, access && styles.statusTextOn]}>{access ? '사용 중' : '권한 설정'}</Text></View>}
            subtitle="카카오톡·문자 알림에서 일정 후보를 찾아요"
            title="Android 알림 자동 감지"
          />
        ) : Platform.OS === 'android' ? (
          <SettingRow
            icon="◉"
            right={<View style={styles.statusPill}><Text style={styles.statusText}>네이티브 빌드 필요</Text></View>}
            subtitle="Expo Go에서는 직접 입력과 AI 분석을 사용할 수 있어요"
            title="Android 알림 자동 감지"
          />
        ) : (
          <SettingRow icon="↗" subtitle="직접 입력하거나 memoa://capture 링크로 가져와요" title="iPhone 메시지 가져오기" />
        )}
        <View style={styles.separator} />
        <SettingRow icon="⌁" subtitle="원본 메시지는 일정 데이터에 저장하지 않아요" title="메시지 개인정보 보호" />
      </View>

      <Text style={styles.sectionLabel}>일정과 알림</Text>
      <View style={styles.group}>
        <SettingRow icon="◷" subtitle="일정 1시간 전으로 예약 정보를 저장해요" title="기본 알림 시간" />
        <View style={styles.separator} />
        <SettingRow icon="▦" subtitle="추후 Google·Apple Calendar 연동 예정" title="외부 캘린더 연동" />
      </View>

      <View style={styles.privacyBox}>
        <Text style={styles.privacyMark}>M</Text>
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Privacy by design</Text>
          <Text style={styles.privacyBody}>일정에 꼭 필요한 제목, 날짜, 시간, 준비물만 저장하도록 설계했습니다.</Text>
        </View>
      </View>

      <Pressable onPress={onLogout} style={styles.logout}><Text style={styles.logoutText}>{session.guest ? '체험 종료' : '로그아웃'}</Text></Pressable>
      <Text style={styles.version}>MemoA 1.0.0 · Android & iOS</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {backgroundColor: colors.background, paddingBottom: 34, paddingHorizontal: 20},
  eyebrow: {color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.3},
  title: {color: colors.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.8, marginTop: 4},
  profile: {alignItems: 'center', backgroundColor: colors.ink, borderRadius: radius.large, flexDirection: 'row', marginTop: 20, padding: 18},
  avatar: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: 24, height: 48, justifyContent: 'center', width: 48},
  avatarText: {color: colors.ink, fontSize: 18, fontWeight: '900'},
  profileCopy: {flex: 1, paddingHorizontal: 13},
  name: {color: colors.white, fontSize: 16, fontWeight: '900'},
  email: {color: '#B8C8C2', fontSize: 10, marginTop: 4},
  plan: {borderColor: '#527168', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5},
  planText: {color: colors.accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.8},
  sectionLabel: {color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8, marginLeft: 3, marginTop: 22},
  group: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, overflow: 'hidden'},
  row: {alignItems: 'center', flexDirection: 'row', minHeight: 72, paddingHorizontal: 14, paddingVertical: 12},
  rowIcon: {alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 17, height: 34, justifyContent: 'center', width: 34},
  rowIconText: {color: colors.ink, fontSize: 16, fontWeight: '900'},
  rowCopy: {flex: 1, paddingHorizontal: 11},
  rowTitle: {color: colors.text, fontSize: 13, fontWeight: '800'},
  rowSubtitle: {color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 3},
  chevron: {color: colors.textMuted, fontSize: 23},
  separator: {backgroundColor: colors.line, height: StyleSheet.hairlineWidth, marginLeft: 59},
  statusPill: {backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6},
  statusOn: {backgroundColor: colors.accent},
  statusText: {color: colors.textMuted, fontSize: 9, fontWeight: '800'},
  statusTextOn: {color: colors.ink},
  privacyBox: {alignItems: 'center', backgroundColor: colors.mint, borderRadius: radius.medium, flexDirection: 'row', gap: 12, marginTop: 17, padding: 15},
  privacyMark: {color: colors.ink, fontSize: 22, fontWeight: '900'},
  privacyCopy: {flex: 1},
  privacyTitle: {color: colors.ink, fontSize: 11, fontWeight: '900'},
  privacyBody: {color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 3},
  logout: {alignItems: 'center', borderColor: colors.line, borderRadius: radius.medium, borderWidth: 1, marginTop: 18, paddingVertical: 14},
  logoutText: {color: colors.danger, fontSize: 12, fontWeight: '800'},
  version: {color: colors.textMuted, fontSize: 9, marginTop: 13, textAlign: 'center'},
  pressed: {opacity: 0.68},
});

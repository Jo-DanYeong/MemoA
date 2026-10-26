import React, {useCallback, useEffect, useState} from 'react';
import {AppState, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {UserSession} from '../domain';
import {
  backgroundExecutionAllowed,
  detectionAlertPermissionGranted,
  getSelectableNotificationApps,
  getSelectedNotificationPackages,
  notificationAccessGranted,
  notificationCaptureAvailable,
  NotificationSourceApp,
  openApplicationPermissionSettings,
  openBackgroundExecutionSettings,
  openNotificationAccessSettings,
  requestDetectionAlertPermission,
  saveSelectedNotificationPackages,
} from '../native/capture';
import {
  deviceCalendarPermissionGranted,
  requestDeviceCalendarPermission,
} from '../services/deviceCalendar';
import {colors} from '../theme';

type Props = {
  session: UserSession;
  onLogout: () => void;
};

type RowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  switchOn?: boolean;
  disabled?: boolean;
};

function SettingRow({title, subtitle, value, onPress, switchOn, disabled}: RowProps) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({pressed}) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, disabled && styles.disabledText]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {typeof switchOn === 'boolean' ? (
        <View style={[styles.switch, switchOn && styles.switchOn, disabled && styles.switchDisabled]}>
          <View style={[styles.switchKnob, switchOn && styles.switchKnobOn]} />
        </View>
      ) : value ? <Text style={styles.value}>{value}</Text> : <Text style={styles.chevron}>›</Text>}
    </Pressable>
  );
}

export function SettingsScreen({session, onLogout}: Props) {
  const insets = useSafeAreaInsets();
  const [access, setAccess] = useState(false);
  const [alertPermission, setAlertPermission] = useState(false);
  const [backgroundAllowed, setBackgroundAllowed] = useState(false);
  const [calendarAllowed, setCalendarAllowed] = useState(false);
  const [sourceApps, setSourceApps] = useState<NotificationSourceApp[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [appQuery, setAppQuery] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const hasNativeCapture = notificationCaptureAvailable();

  const refreshCaptureSettings = useCallback(async () => {
    const [nextAccess, nextAlertPermission, nextBackgroundAllowed, nextCalendarAllowed] = await Promise.all([
      notificationAccessGranted(),
      hasNativeCapture ? detectionAlertPermissionGranted() : Promise.resolve(false),
      hasNativeCapture ? backgroundExecutionAllowed() : Promise.resolve(false),
      deviceCalendarPermissionGranted(),
    ]);
    setAccess(nextAccess);
    setAlertPermission(nextAlertPermission);
    setBackgroundAllowed(nextBackgroundAllowed);
    setCalendarAllowed(nextCalendarAllowed);
    if (hasNativeCapture) {
      const [apps, selected] = await Promise.all([
        getSelectableNotificationApps(),
        getSelectedNotificationPackages(),
      ]);
      setSourceApps(apps);
      setSelectedPackages(selected);
    }
  }, [hasNativeCapture]);

  useEffect(() => {
    refreshCaptureSettings();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshCaptureSettings();
      }
    });
    return () => subscription.remove();
  }, [refreshCaptureSettings]);

  const canOpenAccess = Platform.OS === 'android' && hasNativeCapture;
  const selectedNames = sourceApps
    .filter(app => selectedPackages.includes(app.packageName))
    .map(app => app.appName);
  const selectionSummary = sourceApps.length > 0 && selectedNames.length === sourceApps.length
    ? '설치된 앱 전체'
    : selectedNames.length > 3
      ? `${selectedNames.slice(0, 3).join(', ')} 외 ${selectedNames.length - 3}개`
      : selectedNames.join(', ');
  const filteredApps = sourceApps.filter(app => {
    const query = appQuery.trim().toLocaleLowerCase();
    return !query || app.appName.toLocaleLowerCase().includes(query) || app.packageName.toLocaleLowerCase().includes(query);
  });

  const saveSourceSelection = async (next: string[]) => {
    setSelectedPackages(next);
    setSelectionError('');
    try {
      await saveSelectedNotificationPackages(next);
    } catch {
      setSelectionError('선택한 앱을 저장하지 못했습니다. 다시 시도해 주세요.');
      await refreshCaptureSettings();
    }
  };

  const toggleSourceApp = async (packageName: string) => {
    const next = selectedPackages.includes(packageName)
      ? selectedPackages.filter(item => item !== packageName)
      : [...selectedPackages, packageName];
    await saveSourceSelection(next);
  };

  const enableDetectionAlerts = async () => {
    setAlertPermission(await requestDetectionAlertPermission());
  };

  const enableDeviceCalendar = async () => {
    setCalendarAllowed(await requestDeviceCalendarPermission());
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.page, {paddingTop: Math.max(insets.top, 16)}]} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>설정</Text>

        <View style={styles.profile}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{session.displayName.slice(0, 2).toUpperCase()}</Text></View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{session.displayName}</Text>
            <Text style={styles.email}>{session.guest ? '체험 모드' : session.email}</Text>
          </View>
        </View>

        <View style={styles.group}>
          <SettingRow
            onPress={canOpenAccess ? openApplicationPermissionSettings : undefined}
            subtitle={canOpenAccess ? '알림 표시 등 Android 시스템 권한을 관리합니다' : '개발 빌드에서 사용할 수 있어요'}
            title="앱 권한 설정"
          />
          <SettingRow
            onPress={Platform.OS === 'android' && !calendarAllowed ? enableDeviceCalendar : undefined}
            subtitle={calendarAllowed
              ? '새 일정을 MemoA 캘린더에도 자동으로 저장합니다'
              : '권한을 허용하면 휴대폰 캘린더에 일정을 함께 저장합니다'}
            switchOn={calendarAllowed}
            title="기기 캘린더 연동"
          />
          <SettingRow
            onPress={canOpenAccess ? openNotificationAccessSettings : undefined}
            subtitle={canOpenAccess ? (access ? '활성화됨' : '권한을 허용하면 일정 후보를 자동으로 찾아요') : '개발 빌드에서 사용할 수 있어요'}
            switchOn={access}
            title="Android 알림 접근 권한"
          />
          <SettingRow
            onPress={canOpenAccess ? openBackgroundExecutionSettings : undefined}
            subtitle={backgroundAllowed
              ? '배터리 제한 없이 백그라운드 자동 감지를 유지합니다'
              : '자동 감지가 필요할 때 눌러서 허용할 수 있어요'}
            switchOn={backgroundAllowed}
            title="백그라운드 실행"
          />
          <SettingRow
            onPress={hasNativeCapture ? () => setPickerOpen(true) : undefined}
            subtitle={selectionSummary || '선택한 앱의 알림만 분석합니다'}
            title="알림을 읽을 앱"
            value={selectedNames.length ? `${selectedNames.length}개` : '선택 필요'}
          />
          <SettingRow subtitle="일정 알림 시간을 설정합니다" title="일정 알림" />
          <SettingRow
            onPress={hasNativeCapture && !alertPermission ? enableDetectionAlerts : undefined}
            subtitle={alertPermission
              ? '일정 후보를 임시 저장하면 소리와 진동으로 알려드려요'
              : '소리와 진동 알림을 받으려면 권한을 허용해 주세요'}
            switchOn={alertPermission}
            title="감지 알림"
          />
          <SettingRow disabled subtitle="분석 후 원본 메시지를 기기에 저장합니다" switchOn={false} title="원본 메시지 저장" />
          <SettingRow title="앱 정보" value="v1.0.0" />
          <Pressable onPress={onLogout} style={({pressed}) => [styles.logout, pressed && styles.pressed]}>
            <Text style={styles.logoutText}>{session.guest ? '체험 종료' : '로그아웃'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setPickerOpen(false)} visible={pickerOpen}>
        <View style={[styles.pickerPage, {paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 12)}]}>
          <View style={styles.pickerHeader}>
            <View>
              <Text style={styles.pickerTitle}>알림을 읽을 앱</Text>
              <Text style={styles.pickerSubtitle}>날씨·뉴스·배터리 앱은 기본 제외됩니다. 필요한 앱만 켜 주세요.</Text>
            </View>
            <Pressable onPress={() => setPickerOpen(false)} style={styles.doneButton}><Text style={styles.doneText}>완료</Text></Pressable>
          </View>
          <TextInput
            autoCapitalize="none"
            onChangeText={setAppQuery}
            placeholder="앱 이름 검색"
            placeholderTextColor={colors.disabledText}
            style={styles.searchInput}
            value={appQuery}
          />
          <View style={styles.selectionActions}>
            <Pressable onPress={() => saveSourceSelection(sourceApps.map(app => app.packageName))} style={styles.selectionAction}>
              <Text style={styles.selectionActionText}>전체 선택</Text>
            </Pressable>
            <Pressable onPress={() => saveSourceSelection([])} style={styles.selectionAction}>
              <Text style={styles.selectionActionText}>전체 해제</Text>
            </Pressable>
          </View>
          {selectionError ? <Text style={styles.selectionError}>{selectionError}</Text> : null}
          <ScrollView contentContainerStyle={styles.appList} showsVerticalScrollIndicator={false}>
            {filteredApps.length ? filteredApps.map(app => {
              const selected = selectedPackages.includes(app.packageName);
              return (
                <Pressable key={app.packageName} onPress={() => toggleSourceApp(app.packageName)} style={({pressed}) => [styles.appRow, pressed && styles.pressed]}>
                  {app.iconDataUrl ? (
                    <Image source={{uri: app.iconDataUrl}} style={styles.appIconImage} />
                  ) : (
                    <View style={styles.appIcon}><Text style={styles.appIconText}>{app.appName.slice(0, 1).toUpperCase()}</Text></View>
                  )}
                  <View style={styles.appCopy}>
                    <Text style={styles.appName}>{app.appName}</Text>
                    <Text numberOfLines={1} style={styles.packageName}>{app.packageName}</Text>
                  </View>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    <Text style={styles.checkmark}>{selected ? '✓' : ''}</Text>
                  </View>
                </Pressable>
              );
            }) : <Text style={styles.emptyApps}>표시할 앱이 없습니다.</Text>}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {backgroundColor: colors.background, flex: 1},
  page: {backgroundColor: colors.background, flexGrow: 1, paddingBottom: 28},
  title: {color: colors.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.5, minHeight: 52, paddingHorizontal: 16, paddingTop: 10},
  profile: {alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.line, borderTopColor: colors.line, borderWidth: 0, borderBottomWidth: 1, borderTopWidth: 1, flexDirection: 'row', padding: 16},
  avatar: {alignItems: 'center', backgroundColor: colors.accent, borderRadius: 22, height: 44, justifyContent: 'center', width: 44},
  avatarText: {color: colors.white, fontSize: 14, fontWeight: '900'},
  profileCopy: {flex: 1, paddingHorizontal: 12},
  name: {color: colors.text, fontSize: 14, fontWeight: '900'},
  email: {color: colors.textMuted, fontSize: 10, marginTop: 4},
  group: {backgroundColor: colors.surface, marginTop: 12},
  row: {alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 62, paddingHorizontal: 16, paddingVertical: 11},
  rowCopy: {flex: 1, paddingRight: 12},
  rowTitle: {color: colors.text, fontSize: 12, fontWeight: '800'},
  rowSubtitle: {color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 4},
  value: {color: colors.textMuted, fontSize: 10},
  chevron: {color: colors.textMuted, fontSize: 22},
  switch: {backgroundColor: colors.disabled, borderRadius: 12, height: 22, padding: 3, width: 38},
  switchOn: {backgroundColor: colors.accent},
  switchDisabled: {opacity: 0.65},
  switchKnob: {backgroundColor: colors.white, borderRadius: 8, height: 16, width: 16},
  switchKnobOn: {alignSelf: 'flex-end'},
  disabledText: {color: colors.disabledText},
  logout: {borderBottomColor: colors.line, borderBottomWidth: 1, minHeight: 52, paddingHorizontal: 16, paddingVertical: 17},
  logoutText: {color: colors.danger, fontSize: 12, fontWeight: '800'},
  pickerPage: {backgroundColor: colors.background, flex: 1, paddingHorizontal: 16},
  pickerHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 64},
  pickerTitle: {color: colors.ink, fontSize: 19, fontWeight: '900'},
  pickerSubtitle: {color: colors.textMuted, fontSize: 9, marginTop: 4},
  doneButton: {backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9},
  doneText: {color: colors.white, fontSize: 11, fontWeight: '900'},
  searchInput: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 13, height: 46, marginTop: 8, paddingHorizontal: 14},
  selectionActions: {flexDirection: 'row', gap: 8, justifyContent: 'flex-end', paddingTop: 10},
  selectionAction: {backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7},
  selectionActionText: {color: colors.accent, fontSize: 10, fontWeight: '800'},
  selectionError: {color: colors.danger, fontSize: 10, marginTop: 8},
  appList: {paddingBottom: 20, paddingTop: 12},
  appRow: {alignItems: 'center', backgroundColor: colors.surface, borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 64, paddingHorizontal: 12},
  appIcon: {alignItems: 'center', backgroundColor: colors.blueSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36},
  appIconImage: {borderRadius: 8, height: 36, width: 36},
  appIconText: {color: colors.accent, fontSize: 13, fontWeight: '900'},
  appCopy: {flex: 1, paddingHorizontal: 11},
  appName: {color: colors.text, fontSize: 12, fontWeight: '800'},
  packageName: {color: colors.textMuted, fontSize: 8, marginTop: 3},
  checkbox: {alignItems: 'center', borderColor: colors.line, borderRadius: 6, borderWidth: 1.5, height: 22, justifyContent: 'center', width: 22},
  checkboxSelected: {backgroundColor: colors.accent, borderColor: colors.accent},
  checkmark: {color: colors.white, fontSize: 13, fontWeight: '900'},
  emptyApps: {color: colors.textMuted, fontSize: 11, paddingVertical: 30, textAlign: 'center'},
  pressed: {opacity: 0.65},
});

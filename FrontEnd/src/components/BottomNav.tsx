import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors} from '../theme';

export type MainTab = 'home' | 'calendar' | 'list' | 'settings';

type Props = {
  active: MainTab;
  onChange: (tab: MainTab) => void;
};

const items: {key: MainTab; label: string; icon: string}[] = [
  {key: 'home', label: '홈', icon: '⌂'},
  {key: 'calendar', label: '캘린더', icon: '▣'},
  {key: 'list', label: '일정 목록', icon: '☷'},
  {key: 'settings', label: '설정', icon: '⚙'},
];

export function BottomNav({active, onChange}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.shell, {paddingBottom: Math.max(insets.bottom, 10)}]}>
      {items.map(item => {
        const selected = item.key === active;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{selected}}
            key={item.key}
            onPress={() => onChange(item.key)}
            style={({pressed}) => [styles.item, pressed && styles.pressed]}>
            <View style={[styles.icon, selected && styles.iconActive]}>
              <Text style={[styles.iconText, selected && styles.iconTextActive]}>
                {item.icon}
              </Text>
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 6,
  },
  item: {alignItems: 'center', flex: 1, gap: 1, minHeight: 48},
  pressed: {opacity: 0.65},
  icon: {alignItems: 'center', borderRadius: 14, height: 28, justifyContent: 'center', width: 42},
  iconActive: {backgroundColor: colors.blueSoft},
  iconText: {color: colors.textMuted, fontSize: 18, fontWeight: '700', lineHeight: 22},
  iconTextActive: {color: colors.accent},
  label: {color: colors.textMuted, fontSize: 9, fontWeight: '600'},
  labelActive: {color: colors.accent, fontWeight: '800'},
});

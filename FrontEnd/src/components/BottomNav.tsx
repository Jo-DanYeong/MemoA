import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors} from '../theme';

export type MainTab = 'home' | 'calendar' | 'compose' | 'settings';

type Props = {
  active: MainTab;
  onChange: (tab: MainTab) => void;
};

const items: {key: MainTab; label: string; icon: string}[] = [
  {key: 'home', label: '홈', icon: '⌂'},
  {key: 'calendar', label: '일정', icon: '▦'},
  {key: 'compose', label: '추가', icon: '+'},
  {key: 'settings', label: '설정', icon: '○'},
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
            <View style={[styles.icon, selected && styles.iconActive, item.key === 'compose' && styles.addIcon]}>
              <Text style={[styles.iconText, selected && styles.iconTextActive, item.key === 'compose' && styles.addIconText]}>
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
    paddingTop: 9,
    paddingHorizontal: 12,
  },
  item: {alignItems: 'center', flex: 1, gap: 2},
  pressed: {opacity: 0.65},
  icon: {alignItems: 'center', borderRadius: 12, height: 28, justifyContent: 'center', width: 42},
  iconActive: {backgroundColor: colors.accent},
  iconText: {color: colors.textMuted, fontSize: 21, fontWeight: '600', lineHeight: 24},
  iconTextActive: {color: colors.ink},
  addIcon: {backgroundColor: colors.ink, borderRadius: 16, height: 32, marginTop: -4, width: 48},
  addIconText: {color: colors.white, fontSize: 25, fontWeight: '400'},
  label: {color: colors.textMuted, fontSize: 11, fontWeight: '600'},
  labelActive: {color: colors.ink, fontWeight: '800'},
});

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme';

type Props = {
  title: string;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ScreenHeader({title, eyebrow, actionLabel, onAction}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.textGroup}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
  textGroup: {flex: 1},
  eyebrow: {color: colors.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 5},
  title: {color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.8},
  action: {backgroundColor: colors.surfaceMuted, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9},
  actionText: {color: colors.ink, fontSize: 12, fontWeight: '800'},
});

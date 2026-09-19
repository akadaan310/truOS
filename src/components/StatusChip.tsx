import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { ConnectionStatus } from '../types/models';

const STATUS_META: Record<ConnectionStatus, { label: string; color: string }> = {
  CONNECTED: { label: 'Connected', color: colors.success },
  NO_CREDENTIAL: { label: 'No credential', color: colors.neutral },
  EXPIRED: { label: 'Session expired', color: colors.warning },
  ERROR: { label: 'Error', color: colors.danger },
  UNKNOWN: { label: 'Unknown', color: colors.neutral },
};

export function StatusChip({ status }: { status: ConnectionStatus }) {
  const meta = STATUS_META[status];
  return (
    <View style={[styles.chip, { backgroundColor: `${meta.color}26` }]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Card } from '../../../shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../../shared/theme';
import { currency } from '../../../shared/utils/format';

interface StatsCardProps {
  openTotal: number;
  negotiations: number;
  waitingResponse: number;
}

/** Card branco com oportunidades em aberto, negociacoes e pendencias. */
export function StatsCard({ openTotal, negotiations, waitingResponse }: StatsCardProps) {
  useThemeMode();
  return (
    <Card style={styles.card}>
      <View style={styles.main}>
        <Text style={styles.mainValue} numberOfLines={1} adjustsFontSizeToFit>
          {currency(openTotal)}
        </Text>
        <Text style={styles.mainLabel}>Em oportunidades</Text>
      </View>


      <View style={styles.side}>
        <View style={styles.sideRow}>
          <Feather name="target" size={18} color={theme.colors.primary} />
          <Text style={styles.sideValue}>{negotiations}</Text>
        </View>
        <Text style={styles.sideLabel}>Negociacoes</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.side}>
        <View style={styles.sideRow}>
          <Feather name="message-circle" size={18} color={theme.colors.primary} />
          <Text style={styles.sideValue}>{waitingResponse}</Text>
        </View>
        <Text style={styles.sideLabel}>Aguardando resposta</Text>
      </View>
    </Card>
  );
}

const styles = createThemedStyles(() => ({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  main: {
    width: '100%',
    justifyContent: 'center',
    gap: 2,
  },
  mainValue: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  mainLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  divider: {
    width: 1,
    backgroundColor: theme.colors.divider,
  },
  side: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xxs,
  },
  sideValue: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  sideLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
}));

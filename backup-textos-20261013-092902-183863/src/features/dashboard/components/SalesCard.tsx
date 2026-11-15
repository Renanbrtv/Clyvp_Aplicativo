import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Card } from '../../../shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../../shared/theme';
import { currency, percent } from '../../../shared/utils/format';
import { Sparkline } from './Sparkline';

interface SalesCardProps {
  total: number;
  variationPercent: number | null;
  previousLabel: string;
  series: number[];
}

/** Card laranja "Vendas do mes" da tela Inicio. */
export function SalesCard({ total, variationPercent, previousLabel, series }: SalesCardProps) {
  useThemeMode();
  const positive = (variationPercent ?? 0) >= 0;

  return (
    <Card tone="primary" style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.label}>Vendas do mes</Text>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {currency(total)}
        </Text>

        {variationPercent === null ? (
          <Text style={styles.comparison}>Primeiro mes com vendas registradas</Text>
        ) : (
          <View style={styles.variationRow}>
            <View style={styles.badge}>
              <Feather
                name={positive ? 'arrow-up-right' : 'arrow-down-right'}
                size={13}
                color={theme.colors.onPrimary}
              />
              <Text style={styles.badgeText}>{percent(variationPercent)}</Text>
            </View>
            <Text style={styles.comparison}>em relacao a {previousLabel.toLowerCase()}</Text>
          </View>
        )}
      </View>

      <Sparkline values={series} />
    </Card>
  );
}

const styles = createThemedStyles(() => ({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...theme.typography.body,
    color: theme.colors.onPrimaryMuted,
  },
  value: {
    ...theme.typography.display,
    color: theme.colors.onPrimary,
  },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xxs,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.onPrimaryOverlay,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: theme.radius.pill,
  },
  badgeText: {
    ...theme.typography.badge,
    color: theme.colors.onPrimary,
  },
  comparison: {
    ...theme.typography.caption,
    color: theme.colors.onPrimaryMuted,
  },
}));

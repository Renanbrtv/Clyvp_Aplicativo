import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import type { Client } from '../../../shared/api/types';
import { Avatar, Badge, Button } from '../../../shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../../shared/theme';
import { currency, phone as formatPhone, relativeDays, whatsappLink } from '../../../shared/utils/format';

interface ClientCardProps {
  client: Client;
  followUpDays?: number;
  onPress: () => void;
  onContacted?: () => void;
}

function daysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
}

export function ClientCard({ client, followUpDays = 7, onPress, onContacted }: ClientCardProps) {
  useThemeMode();
  const days = daysSince(client.lastContactAt);
  const isNew = client.purchasesCount === 0;
  const isRecurring = client.purchasesCount >= 2;
  const needsAttention = days !== null && days >= followUpDays && !isNew;

  const badge = needsAttention
    ? { label: 'Sem resposta', tone: 'semResposta' as const, icon: 'clock' as const }
    : isRecurring
      ? { label: 'Recorrente', tone: 'recorrente' as const, icon: 'refresh-cw' as const }
      : isNew
        ? { label: 'Novo cliente', tone: 'novoCliente' as const, icon: 'user-plus' as const }
        : null;

  async function openWhatsapp() {
    const link = whatsappLink(client.whatsapp ?? client.phone, `Ola, ${client.name.split(' ')[0]}! Tudo bem?`);
    if (!link) return;
    await Linking.openURL(link);
    onContacted?.();
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        needsAttention ? styles.cardAttention : styles.cardDefault,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.top}>
        <Avatar name={client.name} size={52} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {client.name}
          </Text>
          {badge ? <Badge label={badge.label} tone={badge.tone} icon={badge.icon} /> : null}

          {client.phone || client.whatsapp ? (
            <View style={styles.phoneRow}>
              <Feather name="phone" size={13} color={theme.colors.textSecondary} />
              <Text style={styles.phone}>{formatPhone(client.whatsapp ?? client.phone)}</Text>
            </View>
          ) : null}

          <Text style={styles.lastContact}>
            {days === null ? 'Sem contato registrado' : `Ultimo contato ${relativeDays(days)}`}
          </Text>
        </View>

        <View style={styles.totals}>
          <Text style={styles.totalLabel}>Total comprado</Text>
          <Text style={styles.totalValue}>{currency(client.totalPurchased)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label="WhatsApp"
          variant="outline"
          size="small"
          icon="message-circle"
          onPress={openWhatsapp}
          style={styles.actionButton}
        />
        <Button
          label="Ver historico"
          variant="outline"
          size="small"
          iconRight="chevron-right"
          onPress={onPress}
          style={styles.actionButton}
        />
      </View>
    </Pressable>
  );
}

const styles = createThemedStyles(() => ({
  card: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardDefault: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardAttention: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  pressed: {
    opacity: 0.9,
  },
  top: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phone: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  lastContact: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  totals: {
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.divider,
    paddingLeft: theme.spacing.sm,
    justifyContent: 'center',
    maxWidth: 120,
  },
  totalLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  totalValue: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
}));

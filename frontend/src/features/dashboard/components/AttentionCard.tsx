import { Alert, Linking, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button } from '../../../shared/components';
import { theme, useThemeMode, createThemedStyles } from '../../../shared/theme';
import { currency, waitingLabel, whatsappLink } from '../../../shared/utils/format';
import type { DashboardSummary } from '../../../shared/api/types';
import { Feather } from '@expo/vector-icons';

type Item = DashboardSummary['needsAttention'][number];

interface AttentionCardProps {
  item: Item;
  userName: string;
}

/**
 * Card da secao "Precisa da sua atencao".
 * O botao abre o WhatsApp com a mensagem de retomada ja escrita - e o
 * primeiro pedaco da funcionalidade de recuperacao de clientes.
 */
export function AttentionCard({ item, userName }: AttentionCardProps) {
  useThemeMode();
  const firstName = item.clientName.split(' ')[0];

  const message =
    `Ola, ${firstName}! Tudo bem?\n\n` +
    `Passando para saber se conseguiu analisar a proposta que te enviei` +
    (item.quoteNumber ? ` (proposta #${String(item.quoteNumber).padStart(4, '0')})` : '') +
    `.\n\nCaso tenha alguma duvida ou queira ajustar algum item, posso verificar para voce.\n\n` +
    `Fico a disposicao!\n${userName}`;

  async function handleContact() {
    const link = whatsappLink(item.whatsapp, message);

    if (!link) {
      Alert.alert(
        'Sem WhatsApp cadastrado',
        `${item.clientName} ainda nao tem um numero valido no cadastro.`,
      );
      return;
    }

    const canOpen = await Linking.canOpenURL(link);
    if (!canOpen) {
      Alert.alert('WhatsApp nao encontrado', 'Instale o WhatsApp para enviar a mensagem.');
      return;
    }

    await Linking.openURL(link);
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Avatar name={item.clientName} size={48} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {item.clientName}
          </Text>
          <Text style={styles.detail} numberOfLines={1}>
            {item.quoteNumber ? 'Orcamento' : item.statusLabel} de {currency(item.amount)}
          </Text>
          <View style={styles.alertRow}>
            <Feather name="clock" size={13} color={theme.colors.danger} />
            <Text style={styles.alert} numberOfLines={1}>
              {waitingLabel(item.daysWithoutContact)}
            </Text>
          </View>
        </View>
      </View>

      <Button
        label="Entrar em contato"
        variant="outline"
        size="small"
        icon="message-circle"
        onPress={handleContact}
        style={styles.button}
      />
    </View>
  );
}

const styles = createThemedStyles(() => ({
  card: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  info: {
    flex: 1,
    gap: 1,
  },
  name: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  detail: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  alert: {
    ...theme.typography.caption,
    color: theme.colors.danger,
  },
  button: {
    backgroundColor: theme.colors.surface,
  },
}));

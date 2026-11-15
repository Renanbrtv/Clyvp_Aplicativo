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
 * Cartão da seção "Precisa da sua atenção".
 * O botao abre o WhatsApp com a mensagem de retomada ja escrita - e o
 * primeiro passo da funcionalidade de recuperação de clientes.
 */
export function AttentionCard({ item, userName }: AttentionCardProps) {
  useThemeMode();
  const firstName = item.clientName.split(' ')[0];

  const message =
    `Olá, ${firstName}! Tudo bem?\n\n` +
    `Gostaria de saber se você conseguiu analisar a proposta que enviei` +
    (item.quoteNumber ? ` (proposta nº ${String(item.quoteNumber).padStart(4, '0')})` : '') +
    `.\n\nCaso tenha alguma dúvida ou queira ajustar algum item, posso verificar para você.\n\n` +
    `Fico à disposição!\n${userName}`;

  async function handleContact() {
    const link = whatsappLink(item.whatsapp, message);

    if (!link) {
      Alert.alert(
        'WhatsApp não cadastrado',
        `${item.clientName} ainda não tem um número válido cadastrado.`,
      );
      return;
    }

    const canOpen = await Linking.canOpenURL(link);
    if (!canOpen) {
      Alert.alert('WhatsApp não encontrado', 'Instale o WhatsApp para enviar a mensagem.');
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
            {item.quoteNumber ? 'Orçamento' : item.statusLabel} de {currency(item.amount)}
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

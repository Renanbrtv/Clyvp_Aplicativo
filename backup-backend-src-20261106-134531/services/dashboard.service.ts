import { OPPORTUNITY_STATUS_LABELS, type OpportunityStatus } from '../config/constants';
import { dashboardRepository, type PeriodRange } from '../repositories/dashboard.repository';
import { settingsRepository } from '../repositories/settings.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/app-error';
import { toMysqlDateTime } from '../utils/dates';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const dashboardService = {
  /**
   * Resumo da tela "Inicio".
   * Todos os numeros vem de consultas agregadas no MySQL - nada e fixo no codigo.
   * Enquanto os modulos das proximas etapas nao existirem, os valores
   * simplesmente vem zerados (que e a verdade para uma conta nova).
   */
  async getSummary(userId: number, monthParam?: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('Conta nao encontrada.');
    }

    const reference = parseMonth(monthParam);
    const current = monthRange(reference);
    const previous = monthRange(new Date(Date.UTC(reference.year, reference.month - 2, 1)));

    const settings = await settingsRepository.findByUserId(userId);
    const followUpDays = settings?.follow_up_days ?? 3;

    const [sales, previousSales, series, open, byStatus, quotes, clients, attention] = await Promise.all([
      dashboardRepository.salesInPeriod(userId, current),
      dashboardRepository.salesInPeriod(userId, previous),
      dashboardRepository.salesByWeek(userId, current),
      dashboardRepository.openOpportunities(userId),
      dashboardRepository.opportunitiesByStatus(userId),
      dashboardRepository.pendingQuotes(userId),
      dashboardRepository.clientsCount(userId, current),
      dashboardRepository.needsAttention(userId, followUpDays),
    ]);

    const salesTotal = Number(sales.total ?? 0);
    const previousTotal = Number(previousSales.total ?? 0);

    const statusMap = new Map(byStatus.map((row) => [row.status, row]));
    const countOf = (status: OpportunityStatus) => Number(statusMap.get(status)?.quantidade ?? 0);

    const negotiations =
      countOf('novo_contato') +
      countOf('proposta_enviada') +
      countOf('negociacao') +
      countOf('aguardando_pagamento');

    return {
      user: { id: user.id, name: user.name, firstName: user.name.split(' ')[0] },
      period: {
        month: reference.month,
        year: reference.year,
        label: `${MONTH_NAMES[reference.month - 1]}`,
        previousLabel: MONTH_NAMES[(reference.month + 10) % 12],
      },
      sales: {
        total: salesTotal,
        count: Number(sales.quantidade ?? 0),
        previousTotal,
        variationPercent: variation(salesTotal, previousTotal),
        /** 5 semanas do mes; semanas sem venda vem como zero. */
        weeklySeries: buildWeeklySeries(series),
      },
      opportunities: {
        openTotal: Number(open.total ?? 0),
        openCount: Number(open.quantidade ?? 0),
        negotiations,
        waitingResponse: countOf('proposta_enviada'),
        byStatus: byStatus.map((row) => ({
          status: row.status,
          label: OPPORTUNITY_STATUS_LABELS[row.status as OpportunityStatus] ?? row.status,
          count: Number(row.quantidade),
          total: Number(row.total ?? 0),
        })),
      },
      quotes: {
        pendingCount: Number(quotes.quantidade ?? 0),
        pendingTotal: Number(quotes.total ?? 0),
      },
      clients: {
        total: Number(clients.quantidade ?? 0),
        newThisMonth: Number(clients.total ?? 0),
      },
      needsAttention: attention.map((row) => ({
        opportunityId: row.opportunity_id,
        clientId: row.client_id,
        clientName: row.client_name,
        whatsapp: row.client_whatsapp ?? row.client_phone,
        title: row.title,
        amount: Number(row.amount),
        status: row.status,
        statusLabel: OPPORTUNITY_STATUS_LABELS[row.status as OpportunityStatus] ?? row.status,
        daysWithoutContact: Number(row.dias_sem_contato),
        quoteId: row.quote_id,
        quoteNumber: row.quote_number,
      })),
      followUpDays,
    };
  },
};

/** Aceita "2026-09"; sem parametro, usa o mes atual. */
function parseMonth(value?: string): { year: number; month: number } {
  const now = new Date();

  if (!value) {
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }

  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) {
    throw AppError.badRequest('Use o formato AAAA-MM no parametro "month".');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    throw AppError.badRequest('Mes invalido.');
  }

  return { year, month };
}

function monthRange(reference: { year: number; month: number } | Date): PeriodRange {
  const year = reference instanceof Date ? reference.getUTCFullYear() : reference.year;
  const month = reference instanceof Date ? reference.getUTCMonth() + 1 : reference.month;

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  return { start: toMysqlDateTime(start), end: toMysqlDateTime(end) };
}

/** Preenche as 5 semanas do mes, inclusive as que nao tiveram venda. */
function buildWeeklySeries(rows: Array<{ bucket: number; total: number | null }>): number[] {
  const weeks = [0, 0, 0, 0, 0];

  rows.forEach((row) => {
    const index = Number(row.bucket) - 1;
    if (index >= 0 && index < weeks.length) {
      weeks[index] = Number(row.total ?? 0);
    }
  });

  return weeks;
}

function variation(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

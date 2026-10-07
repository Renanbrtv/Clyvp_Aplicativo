import { OPPORTUNITY_STATUS_LABELS, type OpportunityStatus } from '../config/constants';
import type { PeriodRange } from '../repositories/dashboard.repository';
import { statsRepository } from '../repositories/stats.repository';
import { AppError } from '../utils/app-error';
import { toMysqlDateTime } from '../utils/dates';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Tela "Resultados" (Etapa 12). Tudo agregado no MySQL. */
export const statsService = {
  async results(userId: number, monthParam?: string) {
    const reference = parseMonth(monthParam);
    const current = monthRange(reference.year, reference.month);
    const previous = monthRange(
      reference.month === 1 ? reference.year - 1 : reference.year,
      reference.month === 1 ? 12 : reference.month - 1,
    );

    const [
      sales,
      previousSales,
      opportunities,
      quotes,
      pipeline,
      lost,
      newClients,
      recurring,
      topProducts,
      topServices,
      monthly,
    ] = await Promise.all([
      statsRepository.sales(userId, current),
      statsRepository.sales(userId, previous),
      statsRepository.opportunitiesByStatus(userId, current),
      statsRepository.quotesByStatus(userId, current),
      statsRepository.openPipeline(userId),
      statsRepository.lostValue(userId, current),
      statsRepository.newClients(userId, current),
      statsRepository.recurringClients(userId),
      statsRepository.topItems(userId, current, 'produto'),
      statsRepository.topItems(userId, current, 'servico'),
      statsRepository.monthlySales(userId, 6),
    ]);

    const salesTotal = Number(sales.total ?? 0);
    const salesCount = Number(sales.quantidade ?? 0);
    const previousTotal = Number(previousSales.total ?? 0);

    const quoteCount = (status: string) =>
      Number(quotes.find((row) => row.nome === status)?.quantidade ?? 0);

    const sent = quotes
      .filter((row) => ['enviado', 'visualizado', 'aceito', 'recusado', 'expirado'].includes(row.nome))
      .reduce((sum, row) => sum + Number(row.quantidade), 0);
    const accepted = quoteCount('aceito');
    const rejected = quoteCount('recusado');

    const opportunitiesCount = opportunities.reduce((sum, row) => sum + Number(row.quantidade), 0);
    const closedCount = Number(opportunities.find((row) => row.nome === 'fechado')?.quantidade ?? 0);

    return {
      period: {
        month: reference.month,
        year: reference.year,
        label: `${MONTHS[reference.month - 1]} de ${reference.year}`,
        shortLabel: MONTHS[reference.month - 1],
      },
      sales: {
        total: salesTotal,
        count: salesCount,
        previousTotal,
        variationPercent: variation(salesTotal, previousTotal),
        averageTicket: salesCount > 0 ? round2(salesTotal / salesCount) : 0,
      },
      conversion: {
        /** Oportunidades fechadas sobre o total criado no mes. */
        rate: opportunitiesCount > 0 ? round1((closedCount / opportunitiesCount) * 100) : 0,
        opportunities: opportunitiesCount,
        closed: closedCount,
        /** Propostas aceitas sobre enviadas. */
        quoteRate: sent > 0 ? round1((accepted / sent) * 100) : 0,
      },
      quotes: {
        sent,
        accepted,
        rejected,
        draft: quoteCount('rascunho'),
        expired: quoteCount('expirado'),
      },
      pipeline: {
        openTotal: Number(pipeline.total ?? 0),
        openCount: Number(pipeline.quantidade ?? 0),
        byStatus: opportunities.map((row) => ({
          status: row.nome,
          label: OPPORTUNITY_STATUS_LABELS[row.nome as OpportunityStatus] ?? row.nome,
          count: Number(row.quantidade),
          total: Number(row.total ?? 0),
        })),
      },
      lost: {
        total: Number(lost.total ?? 0),
        count: Number(lost.quantidade ?? 0),
      },
      clients: {
        new: Number(newClients.quantidade ?? 0),
        recurring: Number(recurring.quantidade ?? 0),
        recurringRevenue: Number(recurring.total ?? 0),
      },
      topProducts: topProducts.map((row) => ({
        name: row.nome,
        quantity: Number(row.quantidade),
        total: Number(row.total ?? 0),
      })),
      topServices: topServices.map((row) => ({
        name: row.nome,
        quantity: Number(row.quantidade),
        total: Number(row.total ?? 0),
      })),
      monthlySeries: buildSeries(monthly),
    };
  },
};

function buildSeries(rows: Array<{ periodo: string; total: number | null; quantidade: number }>) {
  const map = new Map(rows.map((row) => [row.periodo, row]));
  const series: Array<{ period: string; label: string; total: number; count: number }> = [];

  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const row = map.get(key);

    series.push({
      period: key,
      label: SHORT_MONTHS[date.getUTCMonth()],
      total: Number(row?.total ?? 0),
      count: Number(row?.quantidade ?? 0),
    });
  }

  return series;
}

function parseMonth(value?: string): { year: number; month: number } {
  const now = new Date();
  if (!value) return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };

  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) throw AppError.badRequest('Use o formato AAAA-MM no parametro "month".');

  const month = Number(match[2]);
  if (month < 1 || month > 12) throw AppError.badRequest('Mes invalido.');

  return { year: Number(match[1]), month };
}

function monthRange(year: number, month: number): PeriodRange {
  return {
    start: toMysqlDateTime(new Date(Date.UTC(year, month - 1, 1))),
    end: toMysqlDateTime(new Date(Date.UTC(year, month, 1))),
  };
}

function variation(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return round1(((current - previous) / previous) * 100);
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

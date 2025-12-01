import { parseNumeric } from './number';
import { FinanceOffer } from '../types/financeOffer';
import { CompanyOption, FINANCE_COMPANY_OPTIONS } from '../constants/finance';

export type MonthlySeriesPoint = {
  month: string;
  value: number;
};

export type MonthlyCompanyBreakdown = Record<CompanyOption, number[]>;

const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

const getMonthIndex = (date: Date) => date.getMonth();

const normalizeDate = (value: string, fallbackYear: number): Date | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const fourDigitMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fourDigitMatch) {
    const [month, day, year] = fourDigitMatch.slice(1).map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const twoDigitMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (twoDigitMatch) {
    const [month, day, shortYear] = twoDigitMatch.slice(1).map(Number);
    const year = 2000 + shortYear;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const noYearMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (noYearMatch) {
    const [month, day] = noYearMatch.slice(1).map(Number);
    const parsed = new Date(fallbackYear, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const extractYear = (offer: FinanceOffer, fallbackYear: number): number => {
  const settlementDate = normalizeDate(offer.settlementDate, fallbackYear);
  if (settlementDate) {
    return settlementDate.getFullYear();
  }
  const offerDate = normalizeDate(offer.offerDate, fallbackYear);
  if (offerDate) {
    return offerDate.getFullYear();
  }
  const createdAt = normalizeDate(offer.createdAt, fallbackYear);
  if (createdAt) {
    return createdAt.getFullYear();
  }
  return fallbackYear;
};

export const buildCompanyMonthlyMatrix = (offers: FinanceOffer[], year: number) => {
  const matrix: {
    amount: MonthlyCompanyBreakdown;
    metricTons: MonthlyCompanyBreakdown;
    commission: MonthlyCompanyBreakdown;
  } = {
    amount: Object.fromEntries(FINANCE_COMPANY_OPTIONS.map(company => [company, Array(12).fill(0)])) as MonthlyCompanyBreakdown,
    metricTons: Object.fromEntries(FINANCE_COMPANY_OPTIONS.map(company => [company, Array(12).fill(0)])) as MonthlyCompanyBreakdown,
    commission: Object.fromEntries(FINANCE_COMPANY_OPTIONS.map(company => [company, Array(12).fill(0)])) as MonthlyCompanyBreakdown
  };

  const monthlyTotals = {
    amount: Array(12).fill(0),
    metricTons: Array(12).fill(0),
    commission: Array(12).fill(0)
  };

  offers.forEach(offer => {
    const determineDate = normalizeDate(offer.etd, year);
    if (!determineDate || determineDate.getFullYear() !== year) {
      return;
    }

    const company = offer.company as CompanyOption;
    const monthIndex = getMonthIndex(determineDate);
    const amount = parseNumeric(offer.amount);
    const metricTons = parseNumeric(offer.metricTons);
    const commission = parseNumeric(offer.totalCommission);

    matrix.amount[company][monthIndex] += amount;
    matrix.metricTons[company][monthIndex] += metricTons;
    matrix.commission[company][monthIndex] += commission;
    monthlyTotals.amount[monthIndex] += amount;
    monthlyTotals.metricTons[monthIndex] += metricTons;
    monthlyTotals.commission[monthIndex] += commission;
  });

  const lastNonZeroAmount = monthlyTotals.amount.reduce((acc, value, index) => (value > 0 ? index : acc), -1);
  const lastNonZeroMetricTons = monthlyTotals.metricTons.reduce((acc, value, index) => (value > 0 ? index : acc), -1);
  const lastNonZeroCommission = monthlyTotals.commission.reduce((acc, value, index) => (value > 0 ? index : acc), -1);
  const lastIndexWithData = Math.max(lastNonZeroAmount, lastNonZeroMetricTons, lastNonZeroCommission);
  const currentYear = new Date().getFullYear();
  const currentMonth = currentYear === year ? new Date().getMonth() : 11;
  const visibleCount = Math.min(12, (lastIndexWithData >= 0 ? lastIndexWithData : currentMonth) + 1);

  const monthLabels = Array.from({ length: visibleCount }, (_, index) =>
    monthFormatter.format(new Date(year, index, 1))
  );

  const monthlyAmountSeries: MonthlySeriesPoint[] = monthLabels.map((label, index) => ({
    month: label,
    value: monthlyTotals.amount[index]
  }));

  const monthlyMetricTonSeries: MonthlySeriesPoint[] = monthLabels.map((label, index) => ({
    month: label,
    value: monthlyTotals.metricTons[index]
  }));

  const monthlyCommissionSeries: MonthlySeriesPoint[] = monthLabels.map((label, index) => ({
    month: label,
    value: monthlyTotals.commission[index]
  }));

  const companyAmountTotals = FINANCE_COMPANY_OPTIONS.map(company => ({
    company,
    total: matrix.amount[company].reduce((sum, item) => sum + item, 0)
  }));

  const companyMetricTonTotals = FINANCE_COMPANY_OPTIONS.map(company => ({
    company,
    total: matrix.metricTons[company].reduce((sum, item) => sum + item, 0)
  }));

  const companyCommissionTotals = FINANCE_COMPANY_OPTIONS.map(company => ({
    company,
    total: matrix.commission[company].reduce((sum, item) => sum + item, 0)
  }));

  const totalAmount = companyAmountTotals.reduce((sum, item) => sum + item.total, 0);
  const totalMetricTons = companyMetricTonTotals.reduce((sum, item) => sum + item.total, 0);
  const totalCommission = companyCommissionTotals.reduce((sum, item) => sum + item.total, 0);

  return {
    matrix,
    monthlyAmountSeries,
    monthlyMetricTonSeries,
    monthlyCommissionSeries,
    companyAmountTotals,
    companyMetricTonTotals,
    companyCommissionTotals,
    totalAmount,
    totalMetricTons,
    totalCommission,
    monthLabels
  };
};

export const getAvailableYears = (offers: FinanceOffer[]) => {
  const fallback = new Date().getFullYear();
  const years = new Set<number>();
  offers.forEach(offer => {
    years.add(extractYear(offer, fallback));
  });
  return Array.from(years).sort((a, b) => b - a);
};

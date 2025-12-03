import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Spinner from '../components/Spinner';
import { useFinanceOffers } from '../context/FinanceOffersContext';
import { FINANCE_COMPANY_OPTIONS } from '../constants/finance';
import { buildCompanyMonthlyMatrix, getAvailableYears, MonthlySeriesPoint } from '../utils/financeAggregation';
import { parseNumeric } from '../utils/number';
import { formatNumber } from '../utils/number';
import styles from './DashboardPage.module.css';

const DashboardPage = () => {
  const { loading, offers } = useFinanceOffers();
  const yearOptions = useMemo(() => {
    const fallbackYears = [2025, 2024, 2023, 2022];
    const dynamicYears = getAvailableYears(offers);
    const merged = Array.from(new Set([...fallbackYears, ...dynamicYears]));
    return merged.sort((a, b) => b - a);
  }, [offers]);
  const [selectedYear, setSelectedYear] = useState(() => yearOptions[0] ?? new Date().getFullYear());

  useEffect(() => {
    if (!yearOptions.includes(selectedYear) && yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]);
    }
  }, [yearOptions, selectedYear]);

  const analysis = useMemo(() => buildCompanyMonthlyMatrix(offers, selectedYear), [offers, selectedYear]);

  const yearlyTotals = useMemo(() => {
    const totals = new Map<
      number,
      {
        amount: number;
        commission: number;
        metricTons: number;
      }
    >();

    const parseYear = (raw: string) => {
      if (!raw) {
        return null;
      }
      const trimmed = raw.trim();
      const ymd = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
      if (ymd) {
        return Number(ymd[1]);
      }
      const mdyShort = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2})$/);
      if (mdyShort) {
        return 2000 + Number(mdyShort[3]);
      }
      const ts = Date.parse(trimmed);
      if (!Number.isNaN(ts)) {
        return new Date(ts).getFullYear();
      }
      return null;
    };

    offers.forEach(offer => {
      const year =
        parseYear(offer.settlementDate) ??
        parseYear(offer.offerDate) ??
        parseYear(offer.depositDate) ??
        new Date().getFullYear();
      const current = totals.get(year) ?? { amount: 0, commission: 0, metricTons: 0 };
      totals.set(year, {
        amount: current.amount + parseNumeric(offer.amount),
        commission: current.commission + parseNumeric(offer.totalCommission),
        metricTons: current.metricTons + parseNumeric(offer.metricTons)
      });
    });
    return totals;
  }, [offers]);

  const previousYear = selectedYear - 1;
  const selectedYearTotals = yearlyTotals.get(selectedYear) ?? { amount: 0, commission: 0, metricTons: 0 };
  const previousYearTotals = yearlyTotals.get(previousYear) ?? { amount: 0, commission: 0, metricTons: 0 };

  if (loading) {
    return <Spinner />;
  }

  const topCommission = analysis.companyCommissionTotals
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <div className={styles.container}>
      <header className={styles.dashboardHeader}>
        <div>
          <h2>Finance Dashboard</h2>
          <p>월별 출하량과 커미션 흐름을 한눈에 확인하세요.</p>
        </div>
        <label className={styles.yearFilter}>
          <span>연도</span>
          <select value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>
            {yearOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className={styles.metrics}>
        <div className={styles.metricCard}>
          <h3>총 출하 금액 (US$)</h3>
          <div className={styles.metricValue}>${formatNumber(analysis.totalAmount)}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>총 출하 중량 (S.MT)</h3>
          <div className={styles.metricValue}>{formatNumber(analysis.totalMetricTons)}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>총 커미션 (US$)</h3>
          <div className={styles.metricValue}>${formatNumber(analysis.totalCommission)}</div>
        </div>
        <div className={styles.metricCard}>
          <h3>평균 월별 커미션</h3>
          <div className={styles.metricValue}>
            $
            {formatNumber(
              analysis.totalCommission /
                (analysis.monthlyCommissionSeries.filter((point: MonthlySeriesPoint) => point.value > 0).length || 1)
            )}
          </div>
        </div>
        <div className={styles.metricCard}>
          <h3>상위 커미션 기업</h3>
          <ul className={styles.topList}>
            {topCommission.length === 0 ? (
              <li>데이터 없음</li>
            ) : (
              topCommission.map(item => (
                <li key={item.company}>
                  <strong>{item.company}</strong>
                  <span>${formatNumber(item.total)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className={styles.comparisonCard}>
        <div className={styles.sectionHeader}>
          <h3>연도별 비교</h3>
          <span className={styles.subdued}>
            {previousYear} ↔ {selectedYear} 기준
          </span>
        </div>
        <div className={styles.scrollableTable}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>지표</th>
                <th>{previousYear}</th>
                <th>{selectedYear}</th>
                <th>증감</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: '출하 금액 (US$)',
                  current: selectedYearTotals.amount,
                  prev: previousYearTotals.amount,
                  isCurrency: true
                },
                {
                  label: '커미션 (US$)',
                  current: selectedYearTotals.commission,
                  prev: previousYearTotals.commission,
                  isCurrency: true
                },
                {
                  label: '출하 중량 (S.MT)',
                  current: selectedYearTotals.metricTons,
                  prev: previousYearTotals.metricTons,
                  isCurrency: false
                }
              ].map(row => {
                const delta = row.current - row.prev;
                const formattedCurrent = row.isCurrency ? `$${formatNumber(row.current)}` : formatNumber(row.current);
                const formattedPrev = row.isCurrency ? `$${formatNumber(row.prev)}` : formatNumber(row.prev);
                const formattedDelta = row.isCurrency ? `$${formatNumber(Math.abs(delta))}` : formatNumber(Math.abs(delta));
                const deltaClass =
                  delta === 0 ? styles.deltaNeutral : delta > 0 ? styles.deltaPositive : styles.deltaNegative;
                return (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{formattedPrev}</td>
                    <td>{formattedCurrent}</td>
                    <td>
                      <span className={`${styles.deltaChip} ${deltaClass}`}>
                        {delta === 0 ? '변동 없음' : delta > 0 ? `▲ ${formattedDelta}` : `▼ ${formattedDelta}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.charts}>
        <div className={styles.chartCard}>
          <div className={styles.sectionHeader}>
            <h3>월별 출하 금액 추이 (US$)</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={analysis.monthlyAmountSeries}>
              <defs>
                <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={value => `$${formatNumber(value)}`} />
              <Tooltip formatter={(value: number) => `$${formatNumber(value)}`} />
              <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#weightGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.chartCard}>
          <div className={styles.sectionHeader}>
            <h3>월별 커미션 추이 (US$)</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analysis.monthlyCommissionSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={value => `$${formatNumber(value)}`} />
              <Tooltip formatter={(value: number) => `$${formatNumber(value)}`} />
              <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.tablesSection}>
        <div className={styles.tableCard}>
          <div className={styles.sectionHeader}>
            <h3>Company별 월별 출하 중량 (S.MT)</h3>
            <span>Total: {formatNumber(analysis.totalMetricTons)} MT</span>
          </div>
          <div className={styles.scrollableTable}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  {analysis.monthLabels.map(label => (
                    <th key={`mt-head-${label}`}>{label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {FINANCE_COMPANY_OPTIONS.map(company => {
                  const monthly = analysis.matrix.metricTons[company];
                  const total = analysis.companyMetricTonTotals.find(item => item.company === company)?.total ?? 0;
                  return (
                    <tr key={`${company}-mt`}>
                      <td>{company}</td>
                      {analysis.monthLabels.map((label, index) => (
                        <td key={`${company}-mt-${label}`}>{monthly[index] === 0 ? '-' : formatNumber(monthly[index])}</td>
                      ))}
                      <td>{total === 0 ? '-' : formatNumber(total)}</td>
                    </tr>
                  );
                })}
                <tr className={styles.summaryRow}>
                  <td>Grand Total</td>
                  {analysis.monthlyMetricTonSeries.map(point => (
                    <td key={`total-mt-${point.month}`}>
                      {point.value === 0 ? '-' : formatNumber(point.value)}
                    </td>
                  ))}
                  <td>{formatNumber(analysis.totalMetricTons)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.tablesSection}>
        <div className={styles.tableCard}>
          <div className={styles.sectionHeader}>
            <h3>Company별 월별 출하 금액 (US$)</h3>
            <span>Total: ${formatNumber(analysis.totalAmount)}</span>
          </div>
          <div className={styles.scrollableTable}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  {analysis.monthLabels.map(label => (
                    <th key={`weight-head-${label}`}>{label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {FINANCE_COMPANY_OPTIONS.map(company => {
                  const monthly = analysis.matrix.amount[company];
                  const total = analysis.companyAmountTotals.find(item => item.company === company)?.total ?? 0;
                  return (
                    <tr key={company}>
                      <td>{company}</td>
                      {analysis.monthLabels.map((label, index) => (
                        <td key={`${company}-${label}`}>{monthly[index] === 0 ? '-' : `$${formatNumber(monthly[index])}`}</td>
                      ))}
                      <td>{total === 0 ? '-' : `$${formatNumber(total)}`}</td>
                    </tr>
                  );
                })}
                <tr className={styles.summaryRow}>
                  <td>Grand Total</td>
                  {analysis.monthlyAmountSeries.map(point => (
                    <td key={`total-amount-${point.month}`}>
                      {point.value === 0 ? '-' : `$${formatNumber(point.value)}`}
                    </td>
                  ))}
                  <td>${formatNumber(analysis.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className={styles.tableCard}>
          <div className={styles.sectionHeader}>
            <h3>Company별 월별 커미션 (US$)</h3>
            <span>Total: ${formatNumber(analysis.totalCommission)}</span>
          </div>
          <div className={styles.scrollableTable}>
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  {analysis.monthLabels.map(label => (
                    <th key={`commission-head-${label}`}>{label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {FINANCE_COMPANY_OPTIONS.map(company => {
                  const monthly = analysis.matrix.commission[company];
                  const total = analysis.companyCommissionTotals.find(item => item.company === company)?.total ?? 0;
                  return (
                    <tr key={company}>
                      <td>{company}</td>
                      {analysis.monthLabels.map((label, index) => (
                        <td key={`${company}-commission-${label}`}>
                          {monthly[index] === 0 ? '-' : `$${formatNumber(monthly[index])}`}
                        </td>
                      ))}
                      <td>{total === 0 ? '-' : `$${formatNumber(total)}`}</td>
                    </tr>
                  );
                })}
                <tr className={styles.summaryRow}>
                  <td>Grand Total</td>
                  {analysis.monthlyCommissionSeries.map(point => (
                    <td key={`total-commission-${point.month}`}>
                      {point.value === 0 ? '-' : `$${formatNumber(point.value)}`}
                    </td>
                  ))}
                  <td>${formatNumber(analysis.totalCommission)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
   
    </div>
  );
};

export default DashboardPage;

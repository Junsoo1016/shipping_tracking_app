import { CompanyOption } from '../constants/finance';

export type FinanceOffer = {
  id: string;
  ownerUid: string;
  company: CompanyOption;
  offerNumber: string;
  salesOrder: string;
  invoiceNumber: string;
  customer: string;
  grade: string;
  pricingTerm: string;
  offerMetricTons?: string;
  offerDate: string;
  portOfLoading: string;
  etd: string;
  eta: string;
  bookingNumber: string;
  metricTons: string;
  usdPerMetricTon: string;
  amount: string;
  settlementDate: string;
  paymentCondition: string;
  note?: string;
  commission: string;
  totalCommission: string;
  depositDate: string;
};

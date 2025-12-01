export const FINANCE_COMPANY_OPTIONS = ['JOP', 'Shinichi', 'Newport', 'GPH', 'Winster', 'Forestry', '페이퍼코리아'] as const;

export type CompanyOption = (typeof FINANCE_COMPANY_OPTIONS)[number];

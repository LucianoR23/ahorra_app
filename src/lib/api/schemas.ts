import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  emailVerifiedAt: z.string().optional(),
  isSuperadmin: z.boolean().optional().default(false),
});
export type User = z.infer<typeof userSchema>;

export const authResponseSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  accessExpiresAt: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const googleAuthResponseSchema = authResponseSchema.extend({
  isNewUser: z.boolean(),
});
export type GoogleAuthResponse = z.infer<typeof googleAuthResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  accessExpiresAt: z.string(),
});
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const currencySchema = z.enum(["ARS", "USD", "EUR"]);
export type Currency = z.infer<typeof currencySchema>;

export const householdSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseCurrency: currencySchema,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});
export type Household = z.infer<typeof householdSchema>;

export const adminDeletedHouseholdSchema = householdSchema.extend({
  deletedAt: z.string(),
  owner: z
    .object({
      id: z.string(),
      email: z.string(),
      firstName: z.string(),
      lastName: z.string(),
    })
    .nullable()
    .optional(),
});
export type AdminDeletedHousehold = z.infer<typeof adminDeletedHouseholdSchema>;

export const householdMemberSchema = z.object({
  userId: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(["owner", "member"]),
  joinedAt: z.string(),
});
export type HouseholdMember = z.infer<typeof householdMemberSchema>;

export const loginInputSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

/**
 * Reglas de contraseña alineadas con el backend:
 * 8–128, al menos 1 mayúscula, 1 minúscula y 1 dígito.
 * Carácter especial sugerido (no obligatorio).
 */
export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(128, "Máximo 128 caracteres")
  .regex(/[A-Z]/, "Debe incluir al menos una mayúscula")
  .regex(/[a-z]/, "Debe incluir al menos una minúscula")
  .regex(/[0-9]/, "Debe incluir al menos un número");

export const registerInputSchema = z.object({
  email: z.string().email("Email inválido"),
  password: passwordSchema,
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  inviteToken: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

export const monthlyReportSchema = z.object({
  householdId: z.string(),
  baseCurrency: z.string(),
  month: z.string(),
  from: z.string(),
  to: z.string(),
  spentThisMonth: z.number(),
  billedThisMonth: z.number(),
  dueThisMonth: z.number(),
  byCategory: z.array(
    z.object({
      categoryId: z.string().nullable().optional(),
      categoryName: z.string(),
      total: z.number(),
      pct: z.number(),
      txCount: z.number(),
    }),
  ),
  fixedVariable: z.object({
    fixedTotal: z.number(),
    variableTotal: z.number(),
    fixedPct: z.number(),
    variablePct: z.number(),
    fixedCount: z.number(),
    variableCount: z.number(),
  }),
});
export type MonthlyReport = z.infer<typeof monthlyReportSchema>;

export const expenseSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  createdBy: z.string(),
  categoryId: z.string().nullable().optional(),
  paymentMethodId: z.string(),
  amount: z.number(),
  currency: z.string(),
  amountBase: z.number(),
  baseCurrency: z.string(),
  rateUsed: z.number().optional(),
  rateAt: z.string().optional(),
  description: z.string(),
  spentAt: z.string(),
  installments: z.number(),
  isShared: z.boolean(),
  recurringExpenseId: z.string().nullable().optional(),
  status: z.enum(["draft", "confirmed"]).default("confirmed"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const installmentShareSchema = z.object({
  userId: z.string(),
  amountBaseOwed: z.number(),
});
export type InstallmentShare = z.infer<typeof installmentShareSchema>;

export const installmentSchema = z.object({
  id: z.string(),
  expenseId: z.string(),
  installmentNumber: z.number(),
  installmentAmount: z.number(),
  installmentAmountBase: z.number(),
  billingDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  isPaid: z.boolean(),
  paidAt: z.string().nullable().optional(),
  shares: z.array(installmentShareSchema).optional().default([]),
});
export type Installment = z.infer<typeof installmentSchema>;

export const expenseDetailSchema = z.object({
  expense: expenseSchema,
  installments: z.array(installmentSchema),
});
export type ExpenseDetail = z.infer<typeof expenseDetailSchema>;

export const expenseListResponseSchema = z.object({
  items: z.array(expenseSchema),
  totalCount: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type ExpenseListResponse = z.infer<typeof expenseListResponseSchema>;

export const incomeSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  receivedBy: z.string(),
  paymentMethodId: z.string().nullable().optional(),
  amount: z.number(),
  currency: z.string(),
  amountBase: z.number(),
  baseCurrency: z.string(),
  rateUsed: z.number().optional(),
  rateAt: z.string().optional(),
  source: z.string(),
  description: z.string().nullable().optional(),
  receivedAt: z.string(),
  createdAt: z.string(),
});
export type Income = z.infer<typeof incomeSchema>;

export const incomeListResponseSchema = z.object({
  items: z.array(incomeSchema),
  totalCount: z.number(),
  limit: z.number(),
  offset: z.number(),
});
export type IncomeListResponse = z.infer<typeof incomeListResponseSchema>;

export const recurringFrequencySchema = z.enum(["weekly", "monthly", "yearly"]);
export type RecurringFrequency = z.infer<typeof recurringFrequencySchema>;

export const recurringExpenseSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  createdBy: z.string(),
  categoryId: z.string().nullable().optional(),
  paymentMethodId: z.string(),
  amount: z.number(),
  currency: z.string(),
  description: z.string(),
  installments: z.number(),
  isShared: z.boolean(),
  frequency: recurringFrequencySchema,
  dayOfMonth: z.number().nullable().optional(),
  dayOfWeek: z.number().nullable().optional(),
  monthOfYear: z.number().nullable().optional(),
  isActive: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  lastGenerated: z.string().nullable().optional(),
  createdAt: z.string(),
  amountIsVariable: z.boolean().default(false),
  alertThresholdPct: z.number().nullable().optional(),
  lastAmount: z.number().nullable().optional(),
  lastConfirmedAt: z.string().nullable().optional(),
});
export type RecurringExpense = z.infer<typeof recurringExpenseSchema>;

export const seriesPointSchema = z.object({
  expenseId: z.string(),
  amount: z.number(),
  currency: z.string(),
  spentAt: z.string(),
  variationPct: z.number().nullable().optional(),
});
export type SeriesPoint = z.infer<typeof seriesPointSchema>;

export const seriesStatsSchema = z.object({
  recurringExpenseId: z.string(),
  history: z.array(seriesPointSchema),
  averageLastN: z.number(),
  lastVariationPct: z.number().nullable().optional(),
});
export type SeriesStats = z.infer<typeof seriesStatsSchema>;

export const recurringIncomeSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  receivedBy: z.string().nullable().optional(),
  paymentMethodId: z.string().nullable().optional(),
  amount: z.number(),
  currency: z.string(),
  description: z.string().nullable().optional(),
  source: z.string(),
  frequency: recurringFrequencySchema,
  dayOfMonth: z.number().nullable().optional(),
  dayOfWeek: z.number().nullable().optional(),
  monthOfYear: z.number().nullable().optional(),
  isActive: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string().nullable().optional(),
  lastGenerated: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type RecurringIncome = z.infer<typeof recurringIncomeSchema>;

export const bankSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type Bank = z.infer<typeof bankSchema>;

export const paymentMethodKindSchema = z.enum(["cash", "debit", "credit", "wallet", "transfer"]);
export type PaymentMethodKind = z.infer<typeof paymentMethodKindSchema>;

export const paymentMethodSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  bankId: z.string().nullable().optional(),
  name: z.string(),
  kind: paymentMethodKindSchema,
  allowsInstallments: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const creditCardSchema = z.object({
  id: z.string(),
  paymentMethodId: z.string(),
  alias: z.string(),
  lastFour: z.string().nullable().optional(),
  defaultClosingDay: z.number(),
  defaultDueDay: z.number(),
  debitPaymentMethodId: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type CreditCard = z.infer<typeof creditCardSchema>;

export const creditCardPeriodSchema = z.object({
  creditCardId: z.string(),
  periodYm: z.string(),
  closingDate: z.string(),
  dueDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CreditCardPeriod = z.infer<typeof creditCardPeriodSchema>;

export const insightSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  userId: z.string().nullable().optional(),
  insightDate: z.string(),
  insightType: z.string(),
  title: z.string(),
  body: z.string(),
  severity: z.enum(["info", "warning", "danger"]),
  isRead: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});
export type Insight = z.infer<typeof insightSchema>;

export const categorySchema = z.object({
  id: z.string(),
  householdId: z.string(),
  name: z.string(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const settlementSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  fromUser: z.string(),
  toUser: z.string(),
  amount: z.number(),
  baseCurrency: z.string(),
  note: z.string().nullable().optional(),
  paidAt: z.string(),
  createdAt: z.string(),
});
export type Settlement = z.infer<typeof settlementSchema>;

export const balancePairSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.number(),
});
export type BalancePair = z.infer<typeof balancePairSchema>;

export const balancesResponseSchema = z.object({
  householdId: z.string(),
  balances: z.array(balancePairSchema),
});
export type BalancesResponse = z.infer<typeof balancesResponseSchema>;

export const balancesMeResponseSchema = z.object({
  userId: z.string(),
  owe: z.array(balancePairSchema),
  owedToMe: z.array(balancePairSchema),
  net: z.number(),
});
export type BalancesMeResponse = z.infer<typeof balancesMeResponseSchema>;

export const splitRuleSchema = z.object({
  userId: z.string(),
  weight: z.number(),
});
export type SplitRule = z.infer<typeof splitRuleSchema>;

export const splitRulesResponseSchema = z.object({
  householdId: z.string(),
  rules: z.array(splitRuleSchema),
});
export type SplitRulesResponse = z.infer<typeof splitRulesResponseSchema>;

export const goalScopeSchema = z.enum(["household", "user"]);
export const goalTypeSchema = z.enum(["category_limit", "total_limit", "savings"]);
export const goalPeriodSchema = z.enum(["monthly", "yearly"]);

export const goalSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  scope: goalScopeSchema,
  userId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  goalType: goalTypeSchema,
  targetAmount: z.number(),
  currency: z.string(),
  period: goalPeriodSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
});
export type Goal = z.infer<typeof goalSchema>;

export const goalProgressSchema = z.object({
  goal: goalSchema,
  periodStart: z.string(),
  periodEnd: z.string(),
  currentAmount: z.number(),
  targetAmount: z.number(),
  percent: z.number(),
  status: z.enum(["on_track", "warning", "exceeded", "achieved"]),
});
export type GoalProgress = z.infer<typeof goalProgressSchema>;

export const rateSchema = z.object({
  currency: z.string(),
  source: z.string(),
  rateAvg: z.number(),
  rateBuy: z.number(),
  rateSell: z.number(),
  lastUpdate: z.string(),
  fetchedAt: z.string(),
});
export type Rate = z.infer<typeof rateSchema>;

export const trendPointSchema = z.object({
  month: z.string(),
  spentTotal: z.number(),
  dueTotal: z.number(),
  income: z.number(),
  net: z.number(),
});
export type TrendPoint = z.infer<typeof trendPointSchema>;

export const trendsReportSchema = z.object({
  householdId: z.string(),
  baseCurrency: z.string(),
  months: z.number(),
  points: z.array(trendPointSchema),
});
export type TrendsReport = z.infer<typeof trendsReportSchema>;

export const aiExportCategorySchema = z.object({
  name: z.string(),
  total: z.number(),
  pct: z.number(),
  txCount: z.number(),
});

export const aiExportSchema = z.object({
  householdName: z.string(),
  baseCurrency: z.string(),
  month: z.string(),
  spent: z.number(),
  billed: z.number(),
  due: z.number(),
  fixedTotal: z.number(),
  variableTotal: z.number(),
  fixedPct: z.number(),
  topCategories: z.array(aiExportCategorySchema),
  trendsLast6: z.array(trendPointSchema),
  prompt: z.string(),
});
export type AiExport = z.infer<typeof aiExportSchema>;

export const insightUnreadCountSchema = z.object({
  unread: z.number(),
});
export type InsightUnreadCount = z.infer<typeof insightUnreadCountSchema>;

export const totalIncomeResponseSchema = z.object({
  total: z.number(),
  baseCurrency: z.string(),
  from: z.string(),
  to: z.string(),
});
export type TotalIncomeResponse = z.infer<typeof totalIncomeResponseSchema>;

export const insightGenerateResultSchema = z.object({
  created: z.number(),
  failed: z.number(),
});
export type InsightGenerateResult = z.infer<typeof insightGenerateResultSchema>;

export const creditCardPeriodStatusSchema = z.object({
  noPeriodsLoaded: z.boolean(),
  dueDatePassed: z.boolean(),
  latestPeriod: creditCardPeriodSchema.nullable().optional(),
});
export type CreditCardPeriodStatus = z.infer<typeof creditCardPeriodStatusSchema>;

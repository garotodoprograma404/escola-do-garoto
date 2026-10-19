import {
  bigint,
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { courses, enrollments } from './courses.js'
import {
  couponType,
  transactionStatus,
  transactionType,
  withdrawalMethod,
  withdrawalStatus,
} from './enums.js'
import { users } from './users.js'

export const checkoutOrders = pgTable(
  'checkout_orders',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'checkout_orders_id_seq' }),
    publicId: uuid('public_id').defaultRandom().notNull(),
    userId: uuid('user_id'),
    provider: text().default('mercadopago').notNull(),
    status: text().default('pending').notNull(),
    providerStatus: text('provider_status'),
    externalReference: text('external_reference').notNull(),
    preferenceId: text('preference_id'),
    paymentId: text('payment_id'),
    currency: text().default('BRL').notNull(),
    subtotalAmount: numeric('subtotal_amount', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 10, scale: 2, mode: 'number' })
      .default(0)
      .notNull(),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    couponId: bigint('coupon_id', { mode: 'number' }),
    couponCode: text('coupon_code'),
    couponEligibleCourseIds: bigint('coupon_eligible_course_ids', { mode: 'number' }).array(),
    buyerFullName: text('buyer_full_name').notNull(),
    buyerEmail: text('buyer_email').notNull(),
    buyerPhone: text('buyer_phone'),
    buyerCpf: text('buyer_cpf'),
    requestedPaymentMethod: text('requested_payment_method'),
    checkoutUrl: text('checkout_url'),
    metadata: jsonb().default({}).notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('checkout_orders_buyer_email_idx').using('btree', table.buyerEmail.asc().nullsLast()),
    index('checkout_orders_created_at_idx').using('btree', table.createdAt.desc().nullsFirst()),
    index('checkout_orders_payment_id_idx').using('btree', table.paymentId.asc().nullsLast()),
    index('checkout_orders_status_idx').using('btree', table.status.asc().nullsLast()),
    index('checkout_orders_user_id_idx').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.couponId],
      foreignColumns: [coupons.id],
      name: 'checkout_orders_coupon_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'checkout_orders_user_id_fkey',
    }).onDelete('set null'),
    unique('checkout_orders_public_id_key').on(table.publicId),
    unique('checkout_orders_external_reference_key').on(table.externalReference),
    unique('checkout_orders_preference_id_key').on(table.preferenceId),
    check('checkout_orders_discount_amount_check', sql`discount_amount >= (0)::numeric`),
    check(
      'checkout_orders_status_check',
      sql`status = ANY (ARRAY['pending'::text, 'approved'::text, 'in_process'::text, 'rejected'::text, 'cancelled'::text, 'refunded'::text, 'free_completed'::text, 'failed'::text])`,
    ),
    check('checkout_orders_subtotal_amount_check', sql`subtotal_amount >= (0)::numeric`),
    check('checkout_orders_total_amount_check', sql`total_amount >= (0)::numeric`),
  ],
)

export const checkoutOrderItems = pgTable(
  'checkout_order_items',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'checkout_order_items_id_seq' }),
    orderId: bigint('order_id', { mode: 'number' }).notNull(),
    courseId: bigint('course_id', { mode: 'number' }).notNull(),
    courseTitle: text('course_title').notNull(),
    producerId: uuid('producer_id').notNull(),
    listedPrice: numeric('listed_price', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    finalPrice: numeric('final_price', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    platformCommissionRate: numeric('platform_commission_rate', {
      precision: 5,
      scale: 2,
      mode: 'number',
    })
      .default(10)
      .notNull(),
    platformAmount: numeric('platform_amount', { precision: 10, scale: 2, mode: 'number' })
      .default(0)
      .notNull(),
    producerAmount: numeric('producer_amount', { precision: 10, scale: 2, mode: 'number' })
      .default(0)
      .notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('checkout_order_items_course_id_idx').using('btree', table.courseId.asc().nullsLast()),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'checkout_order_items_course_id_fkey',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [checkoutOrders.id],
      name: 'checkout_order_items_order_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.producerId],
      foreignColumns: [users.id],
      name: 'checkout_order_items_producer_id_fkey',
    }).onDelete('restrict'),
    unique('checkout_order_items_order_course_key').on(table.orderId, table.courseId),
    check('checkout_order_items_final_price_check', sql`final_price >= (0)::numeric`),
    check('checkout_order_items_listed_price_check', sql`listed_price >= (0)::numeric`),
    check('checkout_order_items_platform_amount_check', sql`platform_amount >= (0)::numeric`),
    check(
      'checkout_order_items_platform_commission_rate_check',
      sql`(platform_commission_rate >= (0)::numeric) AND (platform_commission_rate <= (100)::numeric)`,
    ),
    check('checkout_order_items_producer_amount_check', sql`producer_amount >= (0)::numeric`),
  ],
)

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'payment_events_id_seq' }),
    provider: text().default('mercadopago').notNull(),
    eventKey: text('event_key').notNull(),
    eventType: text('event_type').notNull(),
    resourceId: text('resource_id'),
    action: text(),
    payload: jsonb().default({}).notNull(),
    orderId: bigint('order_id', { mode: 'number' }),
    processed: boolean().default(false).notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`timezone('utc'::text, now())`)
      .notNull(),
  },
  (table) => [
    index('payment_events_order_id_idx').using('btree', table.orderId.asc().nullsLast()),
    index('payment_events_processed_idx').using(
      'btree',
      table.processed.asc().nullsLast(),
      table.createdAt.desc().nullsFirst(),
    ),
    index('payment_events_resource_id_idx').using('btree', table.resourceId.asc().nullsLast()),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [checkoutOrders.id],
      name: 'payment_events_order_id_fkey',
    }).onDelete('set null'),
    unique('payment_events_provider_event_key_key').on(table.provider, table.eventKey),
  ],
)

export const transactions = pgTable(
  'transactions',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'transactions_id_seq' }),
    userId: uuid('user_id').notNull(),
    type: transactionType().notNull(),
    amount: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    status: transactionStatus().default('pending').notNull(),
    courseId: bigint('course_id', { mode: 'number' }),
    enrollmentId: bigint('enrollment_id', { mode: 'number' }),
    withdrawalId: bigint('withdrawal_id', { mode: 'number' }),
    paymentMethod: text('payment_method'),
    paymentId: text('payment_id'),
    metadata: jsonb(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_transactions_enrollment_id').using('btree', table.enrollmentId.asc().nullsLast()),
    index('idx_transactions_withdrawal_id').using('btree', table.withdrawalId.asc().nullsLast()),
    index('transactions_course_id_idx').using('btree', table.courseId.asc().nullsLast()),
    index('transactions_created_at_idx').using('btree', table.createdAt.desc().nullsFirst()),
    uniqueIndex('transactions_sale_payment_course_user_key')
      .using(
        'btree',
        table.paymentId.asc().nullsLast(),
        table.courseId.asc().nullsLast(),
        table.userId.asc().nullsLast(),
      )
      .where(
        sql`((payment_id IS NOT NULL) AND (type = 'sale'::transaction_type) AND (course_id IS NOT NULL))`,
      ),
    index('transactions_status_idx').using('btree', table.status.asc().nullsLast()),
    index('transactions_type_idx').using('btree', table.type.asc().nullsLast()),
    index('transactions_user_id_idx').using('btree', table.userId.asc().nullsLast()),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'transactions_course_id_fkey',
    }),
    foreignKey({
      columns: [table.enrollmentId],
      foreignColumns: [enrollments.id],
      name: 'transactions_enrollment_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'transactions_user_id_fkey',
    }),
    foreignKey({
      columns: [table.withdrawalId],
      foreignColumns: [withdrawals.id],
      name: 'transactions_withdrawal_id_fkey',
    }),
  ],
)

export const invoices = pgTable(
  'invoices',
  {
    id: bigserial({ mode: 'bigint' }).primaryKey().notNull(),
    transactionId: bigint('transaction_id', { mode: 'number' }).notNull(),
    invoiceNumber: text('invoice_number').notNull(),
    amount: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 10, scale: 2, mode: 'number' })
      .default(0)
      .notNull(),
    totalAmount: numeric('total_amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    status: text().default('paid').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    pdfUrl: text('pdf_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_invoices_transaction_id').using('btree', table.transactionId.asc().nullsLast()),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: 'invoices_transaction_id_fkey',
    }).onDelete('cascade'),
    unique('invoices_invoice_number_key').on(table.invoiceNumber),
    check(
      'invoices_status_check',
      sql`status = ANY (ARRAY['paid'::text, 'pending'::text, 'cancelled'::text])`,
    ),
  ],
)

export const coupons = pgTable(
  'coupons',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'coupons_id_seq' }),
    code: text().notNull(),
    name: text().notNull(),
    description: text(),
    type: couponType().notNull(),
    value: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    minPurchaseAmount: numeric('min_purchase_amount', { precision: 10, scale: 2, mode: 'number' }),
    maxDiscountAmount: numeric('max_discount_amount', { precision: 10, scale: 2, mode: 'number' }),
    usageLimit: integer('usage_limit'),
    usageCount: integer('usage_count').default(0).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).defaultNow().notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    isActive: boolean('is_active').default(true).notNull(),
    applicableCourseIds: bigint('applicable_course_ids', { mode: 'number' }).array(),
    applicableCategoryIds: bigint('applicable_category_ids', { mode: 'number' }).array(),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('coupons_is_active_idx').using('btree', table.isActive.asc().nullsLast()),
    index('coupons_valid_from_idx').using('btree', table.validFrom.asc().nullsLast()),
    index('coupons_valid_until_idx').using('btree', table.validUntil.asc().nullsLast()),
    index('idx_coupons_created_by').using('btree', table.createdBy.asc().nullsLast()),
    foreignKey({
      columns: [table.createdBy],
      foreignColumns: [users.id],
      name: 'coupons_created_by_fkey',
    }),
    unique('coupons_code_key').on(table.code),
    check(
      'coupons_check',
      sql`(type = 'fixed'::coupon_type) OR ((type = 'percentage'::coupon_type) AND (value <= (100)::numeric))`,
    ),
    check('coupons_usage_count_check', sql`usage_count >= 0`),
    check('coupons_usage_limit_check', sql`(usage_limit IS NULL) OR (usage_limit > 0)`),
    check('coupons_value_check', sql`value > (0)::numeric`),
  ],
)

export const couponUsage = pgTable(
  'coupon_usage',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'coupon_usage_id_seq' }),
    couponId: bigint('coupon_id', { mode: 'number' }).notNull(),
    userId: uuid('user_id').notNull(),
    courseId: bigint('course_id', { mode: 'number' }),
    enrollmentId: bigint('enrollment_id', { mode: 'number' }),
    originalAmount: numeric('original_amount', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    discountAmount: numeric('discount_amount', {
      precision: 10,
      scale: 2,
      mode: 'number',
    }).notNull(),
    finalAmount: numeric('final_amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('coupon_usage_coupon_id_idx').using('btree', table.couponId.asc().nullsLast()),
    uniqueIndex('coupon_usage_coupon_user_course_key')
      .using(
        'btree',
        table.couponId.asc().nullsLast(),
        table.userId.asc().nullsLast(),
        table.courseId.asc().nullsLast(),
      )
      .where(sql`(course_id IS NOT NULL)`),
    index('coupon_usage_used_at_idx').using('btree', table.usedAt.desc().nullsFirst()),
    index('coupon_usage_user_id_idx').using('btree', table.userId.asc().nullsLast()),
    index('idx_coupon_usage_course_id').using('btree', table.courseId.asc().nullsLast()),
    index('idx_coupon_usage_enrollment_id').using('btree', table.enrollmentId.asc().nullsLast()),
    foreignKey({
      columns: [table.couponId],
      foreignColumns: [coupons.id],
      name: 'coupon_usage_coupon_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: 'coupon_usage_course_id_fkey',
    }),
    foreignKey({
      columns: [table.enrollmentId],
      foreignColumns: [enrollments.id],
      name: 'coupon_usage_enrollment_id_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'coupon_usage_user_id_fkey',
    }),
    check('coupon_usage_check', sql`original_amount >= final_amount`),
    check('coupon_usage_discount_amount_check', sql`discount_amount >= (0)::numeric`),
  ],
)

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity({ name: 'withdrawals_id_seq' }),
    userId: uuid('user_id').notNull(),
    amount: numeric({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    method: withdrawalMethod().default('pix').notNull(),
    status: withdrawalStatus().default('pending').notNull(),
    bankData: jsonb('bank_data').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    transactionId: text('transaction_id'),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    accountScope: text('account_scope').default('producer').notNull(),
  },
  (table) => [
    index('idx_withdrawals_approved_by').using('btree', table.approvedBy.asc().nullsLast()),
    index('withdrawals_requested_at_idx').using('btree', table.requestedAt.desc().nullsFirst()),
    index('withdrawals_status_idx').using('btree', table.status.asc().nullsLast()),
    index('withdrawals_user_id_idx').using('btree', table.userId.asc().nullsLast()),
    index('withdrawals_user_scope_status_idx').using(
      'btree',
      table.userId.asc().nullsLast(),
      table.accountScope.asc().nullsLast(),
      table.status.asc().nullsLast(),
    ),
    foreignKey({
      columns: [table.approvedBy],
      foreignColumns: [users.id],
      name: 'withdrawals_approved_by_fkey',
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'withdrawals_user_id_fkey',
    }).onDelete('cascade'),
    check('withdrawals_amount_check', sql`amount > (0)::numeric`),
    check(
      'withdrawals_account_scope_check',
      sql`account_scope = ANY (ARRAY['producer'::text, 'affiliate'::text])`,
    ),
  ],
)

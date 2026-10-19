import { pgEnum } from 'drizzle-orm/pg-core'

export const affiliateApplicationStatus = pgEnum('affiliate_application_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
])

export const affiliateAttributionModel = pgEnum('affiliate_attribution_model', ['last_click'])

export const affiliatePartnershipStatus = pgEnum('affiliate_partnership_status', [
  'pending',
  'approved',
  'rejected',
  'revoked',
])

export const auditAction = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'activate',
  'deactivate',
  'login',
  'logout',
])

export const auditDecision = pgEnum('audit_decision', ['approved', 'rejected', 'changes_requested'])

export const bannerDevice = pgEnum('banner_device', ['desktop', 'mobile', 'both'])

export const blogPostStatus = pgEnum('blog_post_status', ['draft', 'published', 'archived'])

export const certificateEventType = pgEnum('certificate_event_type', [
  'issued_automatic',
  'issued_manual',
  'issue_failed',
  'reissued_same_code',
  'reissued_new_code',
  'revoked',
])

export const certificateIssueMode = pgEnum('certificate_issue_mode', [
  'automatic',
  'manual',
  'reissue',
])

export const certificateStatus = pgEnum('certificate_status', [
  'active',
  'revoked',
  'replaced',
  'issue_failed',
])

export const certificateTemplateStatus = pgEnum('certificate_template_status', [
  'draft',
  'published',
  'archived',
])

export const couponType = pgEnum('coupon_type', ['percentage', 'fixed'])

export const courseLevel = pgEnum('course_level', ['beginner', 'intermediate', 'advanced'])

export const courseStatus = pgEnum('course_status', [
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'archived',
])

export const enrollmentStatus = pgEnum('enrollment_status', [
  'active',
  'completed',
  'cancelled',
  'refunded',
])

export const lessonType = pgEnum('lesson_type', ['video', 'text', 'quiz', 'file'])

export const producerApplicationStatus = pgEnum('producer_application_status', [
  'pending',
  'under_review',
  'approved',
  'rejected',
])

export const questionType = pgEnum('question_type', [
  'multiple_choice',
  'multiple_answer',
  'true_false',
])

export const showcaseType = pgEnum('showcase_type', ['dynamic', 'manual'])

export const ticketCategory = pgEnum('ticket_category', [
  'technical',
  'billing',
  'course_content',
  'account',
  'other',
])

export const ticketPriority = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent'])

export const ticketStatus = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
])

export const transactionStatus = pgEnum('transaction_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
])

export const transactionType = pgEnum('transaction_type', [
  'sale',
  'commission',
  'refund',
  'withdrawal',
  'affiliate_commission',
])

export const userRoleType = pgEnum('user_role_type', ['admin', 'producer', 'student', 'affiliate'])

export const withdrawalMethod = pgEnum('withdrawal_method', ['bank_transfer', 'pix'])

export const withdrawalStatus = pgEnum('withdrawal_status', [
  'pending',
  'approved',
  'processing',
  'completed',
  'rejected',
  'cancelled',
])

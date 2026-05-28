/**
 * Singr Platform — Role definitions
 *
 * Roles are stored as TEXT[] in PostgreSQL.
 * A user can hold multiple roles simultaneously (e.g. ['host', 'singer']).
 */

export const ROLES = {
  GLOBAL_ADMIN: 'global_admin',
  SUPPORT_ADMIN: 'support_admin',
  HOST: 'host',
  HOST_MANAGER: 'host_manager',
  SINGER: 'singer',
  ANONYMOUS: 'anonymous',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Request status values
 */
export const REQUEST_STATUS = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  CANCELLED: 'cancelled',
} as const

export type RequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS]

/**
 * Subscription status values
 */
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  TRIALING: 'trialing',
} as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]

/**
 * WebSocket event names
 */
export const WS_EVENTS = {
  NEW_REQUEST: 'new_request',
  REQUEST_CANCELLED: 'request_cancelled',
  QUEUE_REORDERED: 'queue_reordered',
  DIRECT_MESSAGE: 'direct_message',
  SHOW_UPDATED: 'show_updated',
  SERIAL_CHANGED: 'serial_changed',
} as const

export type WsEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS]

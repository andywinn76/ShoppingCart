// Allowed manual status transitions an admin can make from the orders table.
// Terminal statuses (cancelled, refunded) have no further transitions here.
// Shared between the admin UI (to build the status control) and the
// /api/admin/orders/[id] PATCH handler (to validate server-side).
export const ALLOWED_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['fulfilled', 'cancelled', 'refunded'],
  fulfilled: ['refunded'],
  cancelled: [],
  refunded: [],
};

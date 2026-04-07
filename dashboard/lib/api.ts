export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error: ${res.status} ${text}`);
  }

  return res.json();
}

export const fetchJson = apiFetch;

export async function recommendCourier(orderId: string) {
  return apiFetch(`/orders/${orderId}/recommend-courier`);
}

export async function autoAssignOrder(orderId: string) {
  return apiFetch(`/orders/${orderId}/auto-assign`, {
    method: 'PATCH',
  });
}

export async function approveAutoAssign(orderId: string) {
  return apiFetch(`/orders/${orderId}/approve-auto-assign`, {
    method: 'POST',
  });
}

export async function rejectRecommendation(
  orderId: string,
  body?: {
    rejectedCourierId?: string;
    reason?: string;
  },
) {
  return apiFetch(`/orders/${orderId}/reject-recommendation`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export async function getNextCandidates(
  orderId: string,
  excludeCourierId?: string,
) {
  const query = excludeCourierId
    ? `?excludeCourierId=${encodeURIComponent(excludeCourierId)}`
    : '';
  return apiFetch(`/orders/${orderId}/next-candidates${query}`);
}

export async function getBatchSuggestions(orderId: string) {
  return apiFetch(`/orders/${orderId}/batch-suggestions`);
}

export async function bulkAutoAssign(limit = 10) {
  return apiFetch('/orders/dispatch/bulk-auto-assign', {
    method: 'POST',
    body: JSON.stringify({ limit }),
  });
}
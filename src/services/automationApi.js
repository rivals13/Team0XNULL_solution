const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "paysmart_access_token";

const DEMO_CREDENTIALS = { username: "demo", password: "demo123" };

const fallbackPatterns = [
  { pattern_id: "PATTERN-LBEF-150000", recipient: "LBEF College Fee", amount: 150000, category: "Education", payment_count: 5, average_interval_days: 60, next_due_date: "2025-11-29", confidence: 0.96, message: "Detected recurring payment to LBEF College Fee: 150000 x5. Would you like to automate this?", automation_ready: true },
  { pattern_id: "PATTERN-NABIL-50000", recipient: "Nabil Bank Loan", amount: 50000, category: "Financial", payment_count: 5, average_interval_days: 60, next_due_date: "2025-12-05", confidence: 0.95, message: "Detected recurring payment to Nabil Bank Loan: 50000 x5. Would you like to automate this?", automation_ready: true },
  { pattern_id: "PATTERN-NEA-1000", recipient: "NEA WiFi Bill", amount: 1000, category: "Utilities", payment_count: 5, average_interval_days: 60, next_due_date: "2025-11-29", confidence: 0.94, message: "Detected recurring payment to NEA WiFi Bill: 1000 x5. Would you like to automate this?", automation_ready: true },
];

export function getDemoCredentials() { return { ...DEMO_CREDENTIALS }; }
export function getStoredToken() { if (typeof window === "undefined") return null; return window.localStorage.getItem(TOKEN_KEY); }
export function setStoredToken(token) { if (typeof window === "undefined") return; if (token == null) { try { window.localStorage.removeItem(TOKEN_KEY); } catch {} return; } window.localStorage.setItem(TOKEN_KEY, token); }

async function requestJson(path, options = {}) {
  const { authenticated = false } = options;
  const token = getStoredToken();
  if (authenticated && !token) { try { window.localStorage.removeItem(TOKEN_KEY); } catch {} throw new Error("Invalid token"); }

  const headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (authenticated && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch (err) { throw new Error("Invalid JSON response from backend.", { cause: err }); }

  if (!response.ok) {
    const errorMessage = payload?.detail ?? payload?.message ?? `Request failed with status ${response.status}`;
    const isAuthError = response.status === 401 || String(errorMessage).toLowerCase().includes("invalid token") || String(errorMessage).toLowerCase().includes("authentication required");
    if (authenticated && isAuthError) { try { window.localStorage.removeItem(TOKEN_KEY); } catch {} throw new Error("Invalid token"); }
    throw new Error(errorMessage);
  }

  return payload;
}

function mapPriorityItemToPattern(item) {
  const dueDate = item.due_date ?? item.latest_transaction_date ?? null;
  const paymentCount = Number(item.occurrences_in_year ?? 0);
  const averageAmount = Number(item.average_amount ?? item.latest_amount ?? 0);
  return { pattern_id: item.notification_id ?? `PRIORITY-${item.priority_rank ?? Date.now()}`, recipient: item.service_provider ?? "Unknown provider", amount: averageAmount, category: item.category ?? item.payment_family ?? "unknown", payment_count: paymentCount, average_interval_days: Number(item.merchant_reference?.estimated_interval_days ?? 30), next_due_date: dueDate, confidence: 0.95, message: `${item.service_provider ?? "This service"} appears recurring with priority rank #${item.priority_rank ?? "-"}.`, automation_ready: true, priority_rank: item.priority_rank ?? null };
}

function normalizeApiListResponse(response, key) { if (Array.isArray(response)) return response; if (response && Array.isArray(response[key])) return response[key]; return []; }

export async function fetchTransactionHistory() { return requestJson("/api/transactions-history", { authenticated: true }); }
export async function fetchNotifications() { const response = await requestJson("/api/notifications", { authenticated: false }); return normalizeApiListResponse(response, "notifications"); }
export async function fetchSchedules() { const response = await requestJson("/api/schedules", { authenticated: false }); return normalizeApiListResponse(response, "schedules"); }

export async function scheduleRecurringNotification(notificationId, scheduledDate = null, scheduledAmount = null) { const params = new URLSearchParams(); if (scheduledDate) params.set("scheduled_date", scheduledDate); if (scheduledAmount !== null && scheduledAmount !== undefined) params.set("scheduled_amount", String(scheduledAmount)); const queryString = params.toString(); return requestJson(`/recurring/notifications/${notificationId}/schedule${queryString ? `?${queryString}` : ""}`, { method: "POST", authenticated: true }); }

export async function createSchedule(notificationId, scheduledDate = null, scheduledAmount = null) { const payload = { notification_id: String(notificationId) }; if (scheduledDate) payload.scheduled_date = scheduledDate; if (scheduledAmount !== null && scheduledAmount !== undefined) payload.scheduled_amount = Number(scheduledAmount); return requestJson(`/recurring/schedules`, { method: "POST", authenticated: true, body: JSON.stringify(payload) }); }

export async function ignoreScheduledPayment(scheduleId) { return requestJson(`/recurring/schedules/${scheduleId}/ignore`, { method: "POST", authenticated: true }); }

export async function fetchScheduleSnapshot() { const [transactions, priorityPayload, schedules] = await Promise.all([ fetchTransactionHistory(), requestJson("/api/utility-priority-list", { authenticated: false }), fetchSchedules() ]); const mappedPriorityPatterns = (priorityPayload.priority_list ?? []).map(mapPriorityItemToPattern); return { connected: true, transactions, patterns: mappedPriorityPatterns.length > 0 ? mappedPriorityPatterns : fallbackPatterns, schedules }; }

export async function createAutomationRule(payload) { return requestJson("/automation", { method: "POST", body: JSON.stringify(payload) }); }

export async function fetchAutomations() { return requestJson("/automation", { authenticated: true }); }

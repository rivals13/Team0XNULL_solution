const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";
const TOKEN_KEY = "paysmart_access_token";

const DEMO_CREDENTIALS = {
  username: "demo",
  password: "demo123",
};

const fallbackTransactions = [
  {
    transaction_id: "TXN001",
    amount: 150000,
    recipient: "LBEF College Fee",
    date: "2025-01-30",
    category: "Education",
  },
  {
    transaction_id: "TXN002",
    amount: 1000,
    recipient: "NEA WiFi Bill",
    date: "2025-01-30",
    category: "Utilities",
  },
  {
    transaction_id: "TXN003",
    amount: 50000,
    recipient: "Nabil Bank Loan",
    date: "2025-02-05",
    category: "Financial",
  },
  {
    transaction_id: "TXN004",
    amount: 150000,
    recipient: "LBEF College Fee",
    date: "2025-03-30",
    category: "Education",
  },
  {
    transaction_id: "TXN005",
    amount: 1000,
    recipient: "NEA WiFi Bill",
    date: "2025-03-30",
    category: "Utilities",
  },
  {
    transaction_id: "TXN006",
    amount: 50000,
    recipient: "Nabil Bank Loan",
    date: "2025-04-05",
    category: "Financial",
  },
  {
    transaction_id: "TXN007",
    amount: 150000,
    recipient: "LBEF College Fee",
    date: "2025-05-30",
    category: "Education",
  },
  {
    transaction_id: "TXN008",
    amount: 1000,
    recipient: "NEA WiFi Bill",
    date: "2025-05-30",
    category: "Utilities",
  },
  {
    transaction_id: "TXN009",
    amount: 50000,
    recipient: "Nabil Bank Loan",
    date: "2025-06-05",
    category: "Financial",
  },
  {
    transaction_id: "TXN010",
    amount: 150000,
    recipient: "LBEF College Fee",
    date: "2025-07-30",
    category: "Education",
  },
  {
    transaction_id: "TXN011",
    amount: 1000,
    recipient: "NEA WiFi Bill",
    date: "2025-07-30",
    category: "Utilities",
  },
  {
    transaction_id: "TXN012",
    amount: 50000,
    recipient: "Nabil Bank Loan",
    date: "2025-08-05",
    category: "Financial",
  },
  {
    transaction_id: "TXN013",
    amount: 150000,
    recipient: "LBEF College Fee",
    date: "2025-09-30",
    category: "Education",
  },
  {
    transaction_id: "TXN014",
    amount: 1000,
    recipient: "NEA WiFi Bill",
    date: "2025-09-30",
    category: "Utilities",
  },
  {
    transaction_id: "TXN015",
    amount: 50000,
    recipient: "Nabil Bank Loan",
    date: "2025-10-05",
    category: "Financial",
  },
];

const fallbackPatterns = [
  {
    pattern_id: "PATTERN-LBEF-150000",
    recipient: "LBEF College Fee",
    amount: 150000,
    category: "Education",
    payment_count: 5,
    average_interval_days: 60,
    next_due_date: "2025-11-29",
    confidence: 0.96,
    message: "Detected recurring payment to LBEF College Fee: 150000 x5. Would you like to automate this?",
    automation_ready: true,
  },
  {
    pattern_id: "PATTERN-NABIL-50000",
    recipient: "Nabil Bank Loan",
    amount: 50000,
    category: "Financial",
    payment_count: 5,
    average_interval_days: 60,
    next_due_date: "2025-12-05",
    confidence: 0.95,
    message: "Detected recurring payment to Nabil Bank Loan: 50000 x5. Would you like to automate this?",
    automation_ready: true,
  },
  {
    pattern_id: "PATTERN-NEA-1000",
    recipient: "NEA WiFi Bill",
    amount: 1000,
    category: "Utilities",
    payment_count: 5,
    average_interval_days: 60,
    next_due_date: "2025-11-29",
    confidence: 0.94,
    message: "Detected recurring payment to NEA WiFi Bill: 1000 x5. Would you like to automate this?",
    automation_ready: true,
  },
];

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

async function loginDemo() {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(DEMO_CREDENTIALS),
  });

  if (!response.ok) {
    throw new Error("Unable to authenticate with the automation API.");
  }

  const payload = await response.json();
  setStoredToken(payload.access_token);
  return payload.access_token;
}

async function ensureToken() {
  const existingToken = getStoredToken();
  if (existingToken) {
    return existingToken;
  }

  return loginDemo();
}

async function requestJson(path, options = {}) {
  const { authenticated = true, fallbackValue } = options;

  try {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    if (authenticated) {
      headers.Authorization = `Bearer ${await ensureToken()}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }

    throw error;
  }
}

export async function fetchScheduleSnapshot() {
  const [transactions, patterns] = await Promise.all([
    requestJson("/transactions", {
      fallbackValue: fallbackTransactions,
    }),
    requestJson("/patterns", {
      fallbackValue: { patterns: fallbackPatterns },
    }),
  ]);

  return {
    connected: true,
    transactions,
    patterns: patterns.patterns ?? fallbackPatterns,
  };
}

export async function createAutomationRule(payload) {
  return requestJson("/automation", {
    method: "POST",
    body: JSON.stringify(payload),
    fallbackValue: {
      status: "scheduled",
      automation: {
        automation_id: `AUTO-${Date.now()}`,
        ...payload,
      },
    },
  });
}

export async function fetchAutomations() {
  return requestJson("/automation", {
    fallbackValue: [],
  });
}

export function getDemoCredentials() {
  return DEMO_CREDENTIALS;
}
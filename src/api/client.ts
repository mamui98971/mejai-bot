import liff from '@line/liff';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function fetchWithLiffAuth(endpoint: string, options: RequestInit = {}) {
  const idToken = liff.getIDToken();
  if (!idToken) throw new Error('LINE login is required');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody: { error?: string } = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `API Error: ${response.status}`);
  }

  return response.json();
}

export async function fetchDashboardData() {
  return fetchWithLiffAuth('/api/liff/me');
}

export async function createCheckout(tier: 'premium' | 'standard') {
  return fetchWithLiffAuth('/api/liff/checkout', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

export interface UserProfileInput {
  display_name?: string;
  birthdate?: string;
  age?: number;
  gender?: string;
  weight?: number;
  height?: number;
  goal?: 'ผอม' | 'สมส่วน' | 'อ้วน';
  monthly_budget?: number;
}

export interface AiPersonaInput {
  bot_name?: string;
  bot_age?: number;
  bot_personality?: string;
}

export interface DashboardData {
  user: {
    id: string;
    displayName: string | null;
    tier: 'free' | 'standard' | 'premium';
    messageCount: number;
    monthlyBudget: number;
    birthdate?: string | null;
    age?: number | null;
    gender?: string | null;
    weight?: number | null;
    height?: number | null;
    goal?: 'ผอม' | 'สมส่วน' | 'อ้วน' | null;
  };
  relationship: {
    status: string;
    affinityScore: number;
    bot_name?: string | null;
    bot_age?: number | null;
    bot_personality?: string | null;
  };
  stats: {
    dailyExpense: number;
    monthlyExpense: number;
    dailyCalories: number;
    dailyProtein: number;
    dailySodium: number;
  };
}

export async function updateSettings(userProfile: UserProfileInput, aiPersona: AiPersonaInput) {
  return fetchWithLiffAuth('/api/liff/settings', {
    method: 'PUT',
    body: JSON.stringify({ userProfile, aiPersona }),
  });
}

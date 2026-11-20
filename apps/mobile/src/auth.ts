import { API_URL } from './config';

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
  roles?: { role: string; competitionId: number | null }[];
};

export async function registerAccount(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  if (!response.ok) throw new Error(response.status === 409 ? 'Email already registered.' : 'Registration failed. Use a valid email and at least 8 characters.');
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid email or password.');
    }

    throw new Error(`Login failed (HTTP ${response.status}).`);
  }

  const data: LoginResponse = await response.json();

  if (
    !data ||
    typeof data.accessToken !== 'string' ||
    !data.accessToken ||
    !data.user ||
    typeof data.user.id !== 'number'
  ) {
    throw new Error('Unexpected login response.');
  }

  return data;
}

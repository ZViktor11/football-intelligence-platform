import { API_URL } from './config';
import { authenticatedFetch } from './apiClient';

export type CreateMatchEventInput = {
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
  matchId: number;
  teamId?: number;
  playerId?: number;
  minute?: number;
  isOwnGoal?: boolean;
  playerOutId?: number;
  playerInId?: number;
};

export async function createMatchEvent(
  token: string,
  input: CreateMatchEventInput,
): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/match-events`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',

    },
    body: JSON.stringify(input),
  });

  if (response.ok) return;

  if (response.status === 401) {
    throw new Error('Session expired. Please sign in again.');
  }

  if (response.status === 403) {
    throw new Error('You do not have permission to edit this match.');
  }

  let message = `Could not save event (HTTP ${response.status}).`;

  try {
    const data: { message?: string | string[] } =
      await response.json();

    if (typeof data.message === 'string') {
      message = data.message;
    } else if (Array.isArray(data.message)) {
      message = data.message.join(', ');
    }
  } catch {
    // Keep the HTTP error message if response parsing fails.
  }

  throw new Error(message);
}

export async function deleteMatchEvent(
  token: string,
  eventId: number,
): Promise<void> {
  const response = await authenticatedFetch(`${API_URL}/match-events/${eventId}`, token, {
    method: 'DELETE',
    headers: {

    },
  });

  if (response.ok) return;

  if (response.status === 401) {
    throw new Error('Session expired. Please sign in again.');
  }

  if (response.status === 403) {
    throw new Error('You do not have permission to delete this event.');
  }

  let message = `Could not delete event (HTTP ${response.status}).`;

  try {
    const data: { message?: string | string[] } = await response.json();

    if (typeof data.message === 'string') {
      message = data.message;
    } else if (Array.isArray(data.message)) {
      message = data.message.join(', ');
    }
  } catch {
    // Keep HTTP error message if response parsing fails.
  }

  throw new Error(message);
}

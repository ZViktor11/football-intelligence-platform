export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

export async function authenticatedFetch(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    throw new SessionExpiredError();
  }

  return response;
}

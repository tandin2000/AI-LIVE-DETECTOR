interface StoredKey {
  apiKey: string;
  expiresAt: number;
}

const store = new Map<string, StoredKey>();

export function storeApiKey(sessionId: string, apiKey: string, ttlSeconds: number): void {
  store.set(sessionId, {
    apiKey,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function getApiKey(sessionId: string): string | null {
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(sessionId);
    return null;
  }
  return entry.apiKey;
}

export function deleteApiKey(sessionId: string): void {
  store.delete(sessionId);
}

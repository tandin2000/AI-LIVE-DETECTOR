const STORAGE_KEY = 'openai_api_key';

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearStoredApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function maskApiKey(key: string): string {
  if (key.length <= 11) return 'sk-••••••••';
  return `${key.slice(0, 7)}••••${key.slice(-4)}`;
}

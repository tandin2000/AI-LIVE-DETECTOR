import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { FactCheckResult } from '../config.js';

export interface HistoryEntry extends FactCheckResult {
  id: string;
  timestamp: string;
}

const DATA_DIR = join(process.cwd(), 'data', 'history');

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function historyPath(userId: string): string {
  return join(DATA_DIR, `${userId}.json`);
}

export function getHistory(userId: string): HistoryEntry[] {
  ensureDataDir();
  const path = historyPath(userId);
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as HistoryEntry[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveHistory(userId: string, entries: HistoryEntry[]): void {
  ensureDataDir();
  writeFileSync(historyPath(userId), JSON.stringify(entries.slice(-500), null, 2), 'utf-8');
}

export function addHistoryEntry(userId: string, result: FactCheckResult): HistoryEntry {
  const entries = getHistory(userId);
  const entry: HistoryEntry = {
    ...result,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  entries.push(entry);
  saveHistory(userId, entries);
  return entry;
}

export function deleteHistory(userId: string): void {
  ensureDataDir();
  const path = historyPath(userId);
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

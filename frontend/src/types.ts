export type AudioSource = 'microphone' | 'system_audio';

export type Verdict =
  | 'True'
  | 'Mostly true'
  | 'Unclear'
  | 'Mostly false'
  | 'False'
  | 'Not enough evidence';

export type SessionStatus = 'idle' | 'connecting' | 'listening' | 'paused' | 'stopped';

export interface FactCheckResult {
  claim: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  missing_information: string[];
  source_type: AudioSource;
  should_update_later: boolean;
}

export interface HistoryEntry extends FactCheckResult {
  id: string;
  timestamp: string;
}

export interface SessionResponse {
  token: string;
  expiresIn: number;
  sourceType: AudioSource;
  wsUrl: string;
}

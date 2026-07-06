import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, KeyRound } from 'lucide-react';
import type { AudioSource } from './types';
import { useFactCheckSocket } from './hooks/useFactCheckSocket';
import { useAudioCapture } from './hooks/useAudioCapture';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, maskApiKey } from './hooks/useApiKey';
import { ApiKeyPrompt } from './components/ApiKeyPrompt';
import { AudioSourceSelector } from './components/AudioSourceSelector';
import { LanguageSelector } from './components/LanguageSelector';
import { ControlBar } from './components/ControlBar';
import { ListeningIndicator } from './components/ListeningIndicator';
import { LiveTranscript } from './components/LiveTranscript';
import { ClaimCard } from './components/ClaimCard';
import { TruthScoreCard } from './components/TruthScoreCard';
import { ClaimTimeline } from './components/ClaimTimeline';

export default function App() {
  const [apiKey, setApiKey] = useState<string | null>(() => getStoredApiKey());
  const [showKeyPrompt, setShowKeyPrompt] = useState(() => !getStoredApiKey());
  const [selectedSource, setSelectedSource] = useState<AudioSource | null>(null);
  const [language, setLanguage] = useState('auto');

  const socket = useFactCheckSocket();
  const audioEnabled = socket.status === 'listening';

  const { startCapture, stopCapture, error: audioError } = useAudioCapture(
    socket.sendAudio,
    socket.commitSegment,
    audioEnabled
  );

  const isActive = socket.status === 'listening' || socket.status === 'paused';
  const canStart = apiKey !== null && selectedSource !== null && !isActive && socket.status !== 'connecting';

  const handleSaveKey = useCallback((key: string) => {
    setStoredApiKey(key);
    setApiKey(key);
    setShowKeyPrompt(false);
  }, []);

  const handleChangeKey = useCallback(() => {
    if (isActive) return;
    setShowKeyPrompt(true);
  }, [isActive]);

  const handleClearKey = useCallback(() => {
    if (isActive) return;
    clearStoredApiKey();
    setApiKey(null);
    setShowKeyPrompt(true);
  }, [isActive]);

  const handleStart = useCallback(async () => {
    if (!selectedSource || !apiKey) return;

    try {
      await socket.connect(selectedSource, language, apiKey);
      await startCapture(selectedSource);
    } catch {
      socket.stop();
    }
  }, [selectedSource, language, apiKey, socket, startCapture]);

  const handleStop = useCallback(() => {
    stopCapture();
    socket.stop();
  }, [stopCapture, socket]);

  const displayError = socket.error || audioError;

  if (showKeyPrompt) {
    return <ApiKeyPrompt onSave={handleSaveKey} initialValue={apiKey ?? ''} />;
  }

  return (
    <div className="min-h-screen">
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
          <div className="panel px-4 sm:px-5 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <AudioSourceSelector
                  selected={selectedSource}
                  onSelect={setSelectedSource}
                  disabled={isActive}
                />
                <LanguageSelector
                  value={language}
                  onChange={setLanguage}
                  disabled={isActive}
                />
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleChangeKey}
                    disabled={isActive}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line text-xs font-medium text-ink-muted
                      hover:text-ink-secondary hover:border-line-strong transition-colors disabled:opacity-40"
                    title="Change API key"
                  >
                    <KeyRound size={14} />
                    {maskApiKey(apiKey)}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                <ListeningIndicator
                  status={socket.status}
                  sourceType={socket.sourceType ?? selectedSource}
                />
                <ControlBar
                  status={socket.status}
                  canStart={canStart}
                  onStart={handleStart}
                  onPause={socket.pause}
                  onResume={socket.resume}
                  onStop={handleStop}
                />
              </div>
            </div>
          </div>

          {displayError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm"
            >
              <AlertCircle size={16} />
              {displayError}
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 lg:items-stretch">
            <div className="lg:col-span-4 lg:max-h-[calc(100vh-220px)]">
              <LiveTranscript
                segments={socket.segments}
                liveSegment={socket.liveSegment}
                isListening={socket.status === 'listening'}
              />
            </div>
            <div className="lg:col-span-4">
              <ClaimCard
                claim={socket.currentClaim}
                queuePending={socket.queuePending}
                isVerifying={socket.isVerifying}
              />
            </div>
            <div className="lg:col-span-4">
              <TruthScoreCard
                result={socket.currentResult}
                isVerifying={socket.isVerifying}
                queuePending={socket.queuePending}
              />
            </div>
          </div>

          <ClaimTimeline history={socket.claimHistory} />

          {apiKey && !isActive && (
            <p className="text-center">
              <button
                type="button"
                onClick={handleClearKey}
                className="text-xs text-ink-muted hover:text-red-600 transition-colors"
              >
                Remove saved API key
              </button>
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
}

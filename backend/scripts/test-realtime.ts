import 'dotenv/config';
import WebSocket from 'ws';
import { config } from '../src/config.js';

const url = 'wss://api.openai.com/v1/realtime?intent=transcription';

console.log('Connecting to', url);

const ws = new WebSocket(url, {
  headers: { Authorization: `Bearer ${config.OPENAI_API_KEY}` },
});

ws.on('open', () => {
  console.log('Connected');
  ws.send(
    JSON.stringify({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: { model: config.OPENAI_TRANSCRIPTION_MODEL, language: 'en' },
          },
        },
      },
    })
  );
});

ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  if (event.type === 'error') {
    console.error('ERROR:', JSON.stringify(event, null, 2));
  } else if (event.type?.includes('transcription') || event.type?.startsWith('session')) {
    console.log('EVENT:', event.type, JSON.stringify(event).slice(0, 200));
  }
});

ws.on('error', (err) => console.error('WS error:', err.message));

setTimeout(() => {
  console.log('Done');
  ws.close();
  process.exit(0);
}, 5000);

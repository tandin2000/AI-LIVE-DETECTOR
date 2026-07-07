import 'dotenv/config';
import OpenAI from 'openai';
import { detectClaims, factCheckClaim } from '../src/openai/factcheck.js';

const client = new OpenAI();

async function testModel(name: string): Promise<void> {
  try {
    const r = await client.chat.completions.create({
      model: name,
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      max_tokens: 10,
    });
    console.log(`${name}: OK -`, r.choices[0]?.message?.content);
  } catch (e) {
    console.error(`${name}: FAIL -`, e instanceof Error ? e.message : e);
  }
}

async function main(): Promise<void> {
  for (const model of ['gpt-5.5', 'gpt-4o', 'gpt-4o-mini']) {
    await testModel(model);
  }

  const claims = await detectClaims(
    'The Earth orbits the Sun once every 365 days.',
    'The Earth orbits the Sun once every 365 days.',
    process.env.OPENAI_API_KEY ?? 'sk-test',
    'test-session'
  );
  console.log('detectClaims:', claims.claims, claims.error ?? '');

  if (claims.claims.length > 0) {
    const result = await factCheckClaim(
      claims.claims[0],
      'The Earth orbits the Sun once every 365 days.',
      'microphone',
      process.env.OPENAI_API_KEY ?? 'sk-test',
      'test-session'
    );
    console.log('factCheck:', result.verdict, result.confidence, result.explanation.slice(0, 80));
  }
}

main();

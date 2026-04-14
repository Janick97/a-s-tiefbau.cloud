import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing. ' +
    'Set them in Vercel -> Project Settings -> Environment Variables.'
  );
}

// In-memory per-tab lock. Avoids navigator.locks contention ("another request
// stole it") between concurrent User.me() / query / auto-refresh calls in this tab.
// Single-page app -> a simple serial mutex per lock name is enough.
const memLocks = new Map();
async function memLock(name, _acquireTimeout, fn) {
  const prev = memLocks.get(name) || Promise.resolve();
  let release;
  const next = prev.then(() => new Promise((r) => (release = r)));
  memLocks.set(name, next);
  try {
    await prev;
    return await fn();
  } finally {
    release();
    if (memLocks.get(name) === next) memLocks.delete(name);
  }
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: memLock,
  },
});

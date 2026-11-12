import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchTokens } from './api';
import type { Token } from './types';
import { SwapForm } from './components/SwapForm';

export default function App() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await fetchTokens();
      setTokens(t);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 size-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -right-32 top-1/3 size-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-96 rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <main className="mx-auto flex min-h-screen max-w-md flex-col items-stretch px-4 py-10">
        <header className="mb-6 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card/50 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5 text-fuchsia-400" />
            Fancy Swap
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Swap anything,{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              instantly
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Live prices from Switcheo · simulated on-chain execution
          </p>
        </header>

        <SwapForm tokens={tokens} loading={loading} error={error} onRetry={load} />

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Built with Vite · React · Tailwind · shadcn/ui
        </footer>
      </main>
    </div>
  );
}

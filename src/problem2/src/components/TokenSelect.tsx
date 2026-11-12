import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { Token } from '@/types';
import { TokenIcon } from './TokenIcon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatNumber } from '@/api';

type Props = {
  tokens: Token[];
  selected: Token | null;
  excludeSymbol?: string;
  onChange: (token: Token) => void;
};

export function TokenSelect({ tokens, selected, excludeSymbol, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tokens.filter(
      (t) => t.symbol !== excludeSymbol && (!q || t.symbol.toLowerCase().includes(q)),
    );
  }, [tokens, excludeSymbol, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery('');
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="h-11 shrink-0 gap-2 rounded-full pl-2 pr-3 font-semibold"
        >
          {selected ? (
            <>
              <TokenIcon symbol={selected.symbol} url={selected.iconUrl} size={24} />
              <span>{selected.symbol}</span>
            </>
          ) : (
            <span className="pl-2">Select token</span>
          )}
          <ChevronDown className="size-4 opacity-70" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md gap-0 p-0 sm:rounded-2xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle>Select a token</DialogTitle>
        </DialogHeader>
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by symbol…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No tokens found
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.symbol}
                type="button"
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <TokenIcon symbol={t.symbol} url={t.iconUrl} size={32} />
                <div className="flex-1">
                  <div className="font-medium">{t.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    ${formatNumber(t.price, 6)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

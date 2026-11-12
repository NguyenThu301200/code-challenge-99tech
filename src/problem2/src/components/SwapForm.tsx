import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, CheckCircle2, Loader2, Wallet } from 'lucide-react';
import type { Token } from '@/types';
import { formatAmount, formatNumber } from '@/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TokenSelect } from './TokenSelect';
import { TokenIcon } from './TokenIcon';
import { cn } from '@/lib/utils';

type Props = {
  tokens: Token[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

const MOCK_BALANCE = 1000;
const AMOUNT_RE = /^[0-9]*[.,]?[0-9]*$/;

type Side = 'from' | 'to';

export function SwapForm({ tokens, loading, error, onRetry }: Props) {
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [active, setActive] = useState<Side>('from');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | {
    from: Token;
    to: Token;
    fromAmount: string;
    toAmount: string;
  }>(null);

  // Auto-pick a sensible default pair once tokens arrive
  useEffect(() => {
    if (tokens.length === 0) return;
    if (!fromToken) {
      setFromToken(tokens.find((t) => t.symbol === 'ETH') ?? tokens[0]);
    }
    if (!toToken) {
      setToToken(tokens.find((t) => t.symbol === 'USDC') ?? tokens[1] ?? tokens[0]);
    }
  }, [tokens, fromToken, toToken]);

  const rate = useMemo(() => {
    if (!fromToken || !toToken || toToken.price === 0) return null;
    return fromToken.price / toToken.price;
  }, [fromToken, toToken]);

  // Recompute dependent side when inputs/tokens change
  useEffect(() => {
    if (!rate) return;
    if (active === 'from') {
      const n = parseAmount(fromAmount);
      setToAmount(n === null || n === 0 ? '' : formatAmount(n * rate));
    } else {
      const n = parseAmount(toAmount);
      setFromAmount(n === null || n === 0 ? '' : formatAmount(n / rate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken, toToken, rate]);

  function handleFromChange(v: string) {
    if (!AMOUNT_RE.test(v)) return;
    setActive('from');
    setFromAmount(v);
    if (!rate) return setToAmount('');
    const n = parseAmount(v);
    setToAmount(n === null || n === 0 ? '' : formatAmount(n * rate));
  }

  function handleToChange(v: string) {
    if (!AMOUNT_RE.test(v)) return;
    setActive('to');
    setToAmount(v);
    if (!rate) return setFromAmount('');
    const n = parseAmount(v);
    setFromAmount(n === null || n === 0 ? '' : formatAmount(n / rate));
  }

  function handleFlip() {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setActive(active === 'from' ? 'to' : 'from');
  }

  const fromNum = parseAmount(fromAmount) ?? 0;
  const toNum = parseAmount(toAmount) ?? 0;
  const sameToken = fromToken && toToken && fromToken.symbol === toToken.symbol;
  const exceedsBalance = fromNum > MOCK_BALANCE;
  const usdValue = fromToken ? fromNum * fromToken.price : 0;

  let validationMsg: string | null = null;
  if (!fromToken || !toToken) validationMsg = 'Select both tokens';
  else if (sameToken) validationMsg = 'Pick two different tokens';
  else if (fromNum <= 0) validationMsg = 'Enter an amount';
  else if (exceedsBalance) validationMsg = `Insufficient balance (max ${MOCK_BALANCE})`;

  const canSubmit = !validationMsg && !submitting && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !fromToken || !toToken) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setSuccess({
      from: fromToken,
      to: toToken,
      fromAmount: formatAmount(fromNum),
      toAmount: formatAmount(toNum),
    });
    setFromAmount('');
    setToAmount('');
  }

  if (loading) {
    return (
      <Card>
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="mx-auto h-10 w-10 rounded-full" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="space-y-4 py-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Card>
          <AmountPanel
            label="You pay"
            amount={fromAmount}
            onAmountChange={handleFromChange}
            token={fromToken}
            onTokenChange={setFromToken}
            tokens={tokens}
            excludeSymbol={toToken?.symbol}
            usdValue={usdValue}
            showBalance
          />

          <div className="relative flex justify-center" style={{ height: 0 }}>
            <button
              type="button"
              onClick={handleFlip}
              aria-label="Flip tokens"
              className="absolute -top-5 z-10 flex size-10 items-center justify-center rounded-xl border-4 border-background bg-secondary text-foreground shadow-sm transition hover:rotate-180 hover:bg-accent"
            >
              <ArrowDown className="size-4" />
            </button>
          </div>

          <AmountPanel
            label="You receive"
            amount={toAmount}
            onAmountChange={handleToChange}
            token={toToken}
            onTokenChange={setToToken}
            tokens={tokens}
            excludeSymbol={fromToken?.symbol}
            usdValue={toToken ? toNum * toToken.price : 0}
          />

          {rate && fromToken && toToken && !sameToken && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span>Rate</span>
              <span className="font-mono text-foreground">
                1 {fromToken.symbol} ≈ {formatNumber(rate, 6)} {toToken.symbol}
              </span>
            </div>
          )}

          <Button
            type="submit"
            size="xl"
            disabled={!canSubmit}
            className={cn(
              'mt-4 w-full rounded-xl text-base',
              validationMsg && 'bg-muted text-muted-foreground hover:bg-muted',
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Swapping…
              </>
            ) : (
              validationMsg ?? 'Swap'
            )}
          </Button>
        </Card>
      </form>

      <Dialog open={!!success} onOpenChange={(v) => !v && setSuccess(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center">
            <CheckCircle2 className="mb-2 size-14 text-emerald-500" />
            <DialogTitle>Swap successful</DialogTitle>
            <DialogDescription>Your transaction has been simulated.</DialogDescription>
          </DialogHeader>
          {success && (
            <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sent</span>
                <span className="flex items-center gap-2 font-medium">
                  {success.fromAmount}
                  <TokenIcon
                    symbol={success.from.symbol}
                    url={success.from.iconUrl}
                    size={18}
                  />
                  {success.from.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Received</span>
                <span className="flex items-center gap-2 font-medium">
                  {success.toAmount}
                  <TokenIcon
                    symbol={success.to.symbol}
                    url={success.to.iconUrl}
                    size={18}
                  />
                  {success.to.symbol}
                </span>
              </div>
            </div>
          )}
          <Button onClick={() => setSuccess(null)} className="w-full" size="lg">
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border bg-card/60 p-4 shadow-xl backdrop-blur-xl sm:p-5">
      {children}
    </div>
  );
}

type PanelProps = {
  label: string;
  amount: string;
  onAmountChange: (v: string) => void;
  token: Token | null;
  onTokenChange: (t: Token) => void;
  tokens: Token[];
  excludeSymbol?: string;
  usdValue: number;
  showBalance?: boolean;
};

function AmountPanel({
  label,
  amount,
  onAmountChange,
  token,
  onTokenChange,
  tokens,
  excludeSymbol,
  usdValue,
  showBalance,
}: PanelProps) {
  return (
    <div className="rounded-2xl bg-muted/40 p-4 transition-colors focus-within:bg-muted/70">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {showBalance && (
          <button
            type="button"
            onClick={() => onAmountChange(String(MOCK_BALANCE))}
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Wallet className="size-3.5" />
            Balance: {MOCK_BALANCE}
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <input
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50"
        />
        <TokenSelect
          tokens={tokens}
          selected={token}
          excludeSymbol={excludeSymbol}
          onChange={onTokenChange}
        />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        ≈ ${formatNumber(usdValue, 2)}
      </div>
    </div>
  );
}

function parseAmount(v: string): number | null {
  if (!v) return 0;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

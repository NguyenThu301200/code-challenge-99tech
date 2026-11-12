import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  symbol: string;
  url: string;
  size?: number;
  className?: string;
};

export function TokenIcon({ symbol, url, size = 28, className }: Props) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 font-semibold text-white',
          className,
        )}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {symbol.slice(0, 3)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={symbol}
      width={size}
      height={size}
      className={cn('rounded-full', className)}
      onError={() => setError(true)}
    />
  );
}

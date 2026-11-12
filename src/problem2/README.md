# Fancy Swap — Currency Swap Form

A polished currency swap form built for the [99techteam code-challenge Problem 2](https://github.com/99techteam/code-challenge).

Live token prices are fetched from `https://interview.switcheo.com/prices.json`.
Icons are loaded from the [Switcheo token-icons](https://github.com/Switcheo/token-icons) repo.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (new-york style, neutral palette)
- **lucide-react** icons
- **Radix UI** primitives (Dialog, Label, Slot)

## Features

- **Dual-input swap card** (pay / receive) with bidirectional sync — editing either side recomputes the other in real time.
- **Token picker modal** with search, token icon, and live USD price.
- **Flip button** swaps the two tokens and their amounts.
- **USD value preview** under each amount.
- **MAX balance shortcut** (mocked at 1000) via the wallet badge.
- **Live exchange rate** displayed between the two cards.
- **Validation**: enter an amount, pick two different tokens, respect balance — the submit button surfaces the exact blocker.
- **Loading simulation**: ~1.2s spinner then a success dialog recapping amounts.
- **Error / retry** on the initial price fetch.
- **Graceful icon fallback**: tokens without an SVG show a gradient initials badge.
- **Dark glassmorphism UI** with animated gradient blobs.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

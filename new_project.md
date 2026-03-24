

  Project: Stake IPL

  Headline:
  A full-stack IPL prediction platform built around fictional in-app coins, ledger-backed wallets, and admin-managed markets.

  Description:
  Stake IPL is a simulated sports prediction web app where users join IPL-related markets, place stakes with virtual coins, and
  compete on public and group leaderboards. It includes a full admin panel for creating matches and markets, controlling market
  lifecycle, settling outcomes, and managing balances. No real-money flows are involved.

  Tech stack:
  - Next.js 15
  - React 19
  - TypeScript
  - Prisma
  - PostgreSQL / Neon
  - Auth.js
  - Tailwind CSS

  Key features:
  - User registration and credentials authentication
  - Automatic wallet creation with starter balance
  - Ledger-backed transaction history
  - Market browsing and stake placement with locked quoted odds
  - Admin controls for market creation, status changes, settlement, and top-ups
  - Global and group leaderboards
  - Profile recovery / credential change flows

  Architecture highlights:
  - Prisma data model with wallets, ledger entries, matches, markets, outcomes, stakes, groups, and leaderboard entries
  - Transactional balance handling
  - Persisted leaderboard data recomputed on balance changes
  - App Router-based Next.js full-stack implementation

  Important constraint:
  - Coins are fictional and non-redeemable
  - No deposits or withdrawals

  My role:
  Solo build


  Links:
  - Repo: https://github.com/sYanXO/Steak
  - Live demo: https://steak-hjli.vercel.app/


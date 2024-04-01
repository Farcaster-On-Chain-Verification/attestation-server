# attestation-server

Attest to Farcaster with [EAS](https://attest.sh/) using Vercel Serverless Functions with Node.js (without Next.js).

## Getting Started

You should install `vercel` CLI, if you haven't installed yet.

### Setup

```bash
npm install
```

When you run `npm start` for the first time, a prompt for vercel project settings should appear, so please configure it.

### Deploy

```bash
vercel deploy
```

## Environment Variables

You can use `.env` file locally.

```
cp .env.example .env
```

In production, you should set environment variables via `vercel env` command, or on dashboard.
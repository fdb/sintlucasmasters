# Sint Lucas Masters Website

Student exhibition website built with Cloudflare Workers + Hono + D1.

## Prerequisites

- Node.js 18+
- [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) for secret management

## Installation

```bash
npm install
```

## Setup

1. **Set up secrets** (requires 1Password CLI and access to the vault):
   ```bash
   npm run setup-secrets
   ```

2. **Initialize the database**:
   ```bash
   npm run db:reset
   ```
   This creates the D1 schema and migrates all student data.

## Development

```bash
npm run dev
```

Open [http://localhost:8787](http://localhost:8787) with your browser.

## Database Commands

```bash
npm run db:reset            # Full reset: delete local DB, create schema, run migration
npm run db:reset:remote     # Same for production (use with caution!)
```

## Deployment

```bash
npm run deploy
```

For remote database setup:
```bash
npm run db:reset:remote
npm run setup-secrets:remote
```

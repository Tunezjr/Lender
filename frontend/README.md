# Lender Liquidity Atlas Frontend

Static lender-facing prototype for exploring collateral movement, liquidity routes, and entity attribution from deterministic fixture data.

## Run locally

From the repository root, serve the `frontend/` directory with any static file server, for example:

```bash
npx http-server frontend
```

Then open the local URL shown by the server.

## Deploy

Vercel is configured at the repository root to publish the `frontend/` directory, so the main branch deploy serves `frontend/index.html` with its CSS, JavaScript, and fixture data intact.

## Branch and visibility

The lender frontend is committed on the `main` branch in `frontend/`. The repository root also includes `index.html`, which redirects browsers to `frontend/` for hosts that serve the repository root.


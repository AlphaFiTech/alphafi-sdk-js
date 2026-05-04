# AlphaFi SDK JavaScript

## Build & Test

```bash
npm install
npm run build
npm test
npm run pre-commit:install    # setup pre-commit hooks
npm run pre-commit:run        # run all hooks
pre-commit run prettier --all-files  # run specific hook
```

## Pre-commit Hooks

Configured hooks: Prettier, ESLint, TypeScript type checking, Gitleaks (secret scanning), Markdown linting.

## Project-Specific Guidelines

- All commits scanned for secrets via Gitleaks
- Never commit private keys or secrets — use environment variables
- Commit after each meaningful and complete change (don't batch unrelated changes)
- Update relevant markdown documentation before each meaningful commit

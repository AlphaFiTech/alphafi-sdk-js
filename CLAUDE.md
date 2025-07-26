# Development Guidelines

## Git Commit Guidelines

1. **DO NOT** add "Co-authored-by: Claude" to commit messages
2. **DO NOT** add "Generated with Claude" or similar attribution
3. Keep commit messages concise (50-72 chars for title, details in body if needed)
4. Use conventional commit format when applicable (feat:, fix:, docs:, etc.)
5. **IMPORTANT**: Commit after each meaningful and complete change (don't batch multiple unrelated changes)
6. **CRITICAL**: Pre-commit hooks are configured to automatically run checks before each commit:

   - Code formatting (Prettier)
   - Linting (ESLint)
   - Type checking (TypeScript) - currently disabled, enable after `npm install`
   - Security scanning (Gitleaks)
   - Markdown linting

   To manually run all checks: `pre-commit run --all-files`
   To skip hooks (NOT recommended): `git commit --no-verify`

7. **IMPORTANT**: Update relevant markdown documentation (README.md, CLAUDE.md, etc.) before each meaningful commit
   to keep docs in sync with code changes
8. **CRITICAL**: If any of the above commands fail, fix ALL errors before proceeding with commit

## Project-Specific Guidelines

### Security

- All commits are scanned for secrets using Gitleaks
- TruffleHog configuration is available for deeper security audits
- Never commit actual private keys or secrets
- Use environment variables for sensitive data

### Code Quality

- TypeScript strict mode is enabled
- ESLint is configured with TypeScript support
- Prettier ensures consistent formatting
- All code must pass type checking before commit

### Documentation

- Keep README.md updated with API changes
- Document new features in appropriate markdown files
- Use JSDoc comments for public APIs
- Examples should be self-contained and runnable

## Pre-commit Configuration

The project uses pre-commit hooks to ensure code quality. See `PRE-COMMIT.md` for detailed setup and usage instructions.

### Quick Reference

```bash
# Install pre-commit hooks
npm run pre-commit:install

# Run all hooks manually
npm run pre-commit:run

# Run specific hook
pre-commit run prettier --all-files

# Update hook versions
pre-commit autoupdate
```

## Testing Guidelines

1. Write tests for new features
2. Ensure all tests pass before committing
3. Use descriptive test names
4. Mock external dependencies appropriately

## Code Style

1. Use TypeScript for all new code
2. Prefer functional programming patterns
3. Use async/await over callbacks
4. Handle errors appropriately
5. Add types for all function parameters and returns

## Debugging Tips

1. Use `console.log` sparingly and remove before commit
2. Leverage TypeScript's type system to catch errors early
3. Use the debugger in VS Code or Chrome DevTools
4. Check pre-commit logs for detailed error messages

# Pre-commit Configuration

This project uses [pre-commit](https://pre-commit.com/) to ensure code quality and consistency before commits.

## Setup

1. Install pre-commit (if not already installed):

   ```bash
   # Using pip
   pip install pre-commit

   # On macOS using Homebrew
   brew install pre-commit

   # On Ubuntu/Debian
   apt install pre-commit
   ```

2. Install the git hook scripts:

   ```bash
   npm run pre-commit:install
   # or
   pre-commit install
   ```

## What it does

The pre-commit configuration will automatically run the following checks before each commit:

### General Checks

- **Trailing whitespace**: Removes trailing whitespace from files
- **End of file fixer**: Ensures files end with a newline
- **Check YAML**: Validates YAML syntax
- **Check JSON**: Validates JSON syntax
- **Large files**: Prevents committing files larger than 500KB
- **Case conflicts**: Checks for files that would conflict on case-insensitive filesystems
- **Merge conflicts**: Checks for merge conflict markers
- **Mixed line endings**: Ensures consistent line endings (LF)
- **Private keys**: Detects potential private keys

### JavaScript/TypeScript Specific

- **Prettier**: Formats JS, TS, JSON, MD, and YAML files
- **ESLint**: Lints and fixes JavaScript and TypeScript files
- **TypeScript Check**: Runs type checking on TypeScript files (currently disabled - enable after npm install)

### Security

- **Gitleaks**: Fast secret detection for common patterns (API keys, private keys, etc.)
- **TruffleHog**: Comprehensive security scan that checks git history and validates secrets

### Documentation

- **Markdownlint**: Lints and fixes Markdown files

### Package Management

- **Package.json sorted**: Ensures dependencies are sorted alphabetically (currently disabled - hook not available)

## Manual Usage

To run all pre-commit hooks manually:

```bash
npm run pre-commit:run
# or
pre-commit run --all-files
```

To run a specific hook:

```bash
pre-commit run <hook-id> --all-files
# Example:
pre-commit run prettier --all-files
```

## Skipping Hooks

If you need to skip pre-commit hooks (not recommended):

```bash
git commit --no-verify -m "Your commit message"
```

## Updating Hooks

To update the pre-commit hooks to their latest versions:

```bash
pre-commit autoupdate
```

## Troubleshooting

1. **ESLint errors**: Make sure all TypeScript dependencies are installed:

   ```bash
   npm install
   ```

2. **Permission errors**: Ensure pre-commit is properly installed:

   ```bash
   pre-commit clean
   pre-commit install
   ```

3. **Slow commits**: The TypeScript check is currently disabled. Enable it in `.pre-commit-config.yaml` after
   running `npm install`.

4. **Security scans taking too long**: TruffleHog scans git history which can be slow. You can:

   - Skip it for quick commits: `git commit --no-verify`
   - Run only gitleaks: `pre-commit run gitleaks`
   - Limit scan depth in `.trufflehog.yaml` by setting `max-depth: 50`

5. **TruffleHog not installed**: Install it with:

   ```bash
   # macOS
   brew install trufflehog

   # Linux/WSL
   curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | \
     sh -s -- -b /usr/local/bin
   ```

## Configuration Files

- `.pre-commit-config.yaml`: Main pre-commit configuration
- `.prettierrc`: Prettier formatting rules
- `eslint.config.mjs`: ESLint rules
- `.markdownlint.json`: Markdown linting rules
- `.gitleaks.toml`: Gitleaks secret detection rules
- `.trufflehog.yaml`: TruffleHog comprehensive security scan configuration

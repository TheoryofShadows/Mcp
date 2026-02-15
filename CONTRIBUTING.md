# Contributing to MCPX

Thanks for your interest in contributing. This document covers the process for contributing to this repository.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Mcp.git`
3. Install dependencies: `npm install`
4. Copy environment config: `cp .env.example .env`
5. Start development: `npm run dev`
6. Create a branch: `git checkout -b feature/your-feature-name`

## Development

### Prerequisites

- Node.js 20 or later
- npm 10 or later

### Running Locally

```bash
# Start frontend (Vite) + backend (Express)
npm run dev

# Or run them separately
npm run dev:client   # http://localhost:5173
npm run dev:server   # http://localhost:3001
```

The database auto-seeds on first run with demo data.

### Code Quality

Before submitting a PR, make sure everything passes:

```bash
npm run lint     # ESLint
npm test         # Vitest (58 tests)
npm run build    # Production build
```

All three must pass. The CI pipeline runs these automatically on every PR.

## Pull Request Process

1. **Branch** from `main` using a descriptive name (`feature/`, `fix/`, `docs/`)
2. **Write tests** for any new API endpoints or significant logic changes
3. **Run the full check** — lint, test, build must all pass
4. **Write a clear PR description** explaining what changed and why
5. **Keep PRs focused** — one feature or fix per PR
6. **Update documentation** if your change affects the API, env vars, or setup

## Code Standards

### Backend (Express)

- Use prepared SQL statements (never string interpolation)
- Validate all input at the route handler level
- Return consistent error format: `{ "error": "message" }`
- Use async bcrypt (never `hashSync`)
- Add rate limiting to sensitive endpoints

### Frontend (React)

- Use functional components with hooks
- Use the existing design tokens from `globals.css`
- Keep components in the appropriate directory (`sections/`, `ui/`, `pages/`)
- Use the `api/client.js` module for all API calls

### Testing

- Write tests for new API endpoints in `server/__tests__/api.test.js`
- Clean up test data after each test (delete created rows)
- Test both success and error paths
- Test input validation and edge cases

### Commit Messages

Use clear, descriptive commit messages:

```
Add search debouncing to marketplace filter

Fix duplicate review submission on rapid clicks

Update rate limit window from 1min to 15min on auth endpoints
```

## Reporting Bugs

Open a [GitHub issue](https://github.com/TheoryofShadows/Mcp/issues) with:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Environment (OS, Node version, browser)

## Security

If you find a security vulnerability, do **not** open a public issue. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

# Contributing to MCPX

Thank you for your interest in contributing to MCPX! This guide will help you get started.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Code Style](#code-style)

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/mcpx.git
   cd mcpx
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/mcpx/mcpx.git
   ```

## Development Setup

### Prerequisites

- Node.js 18 or 20
- npm 9+
- SQLite3

### Installation

1. Install dependencies:
   ```bash
   npm ci
   ```

2. Set up the environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Initialize the database:
   ```bash
   npm run db:setup
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   This starts both the Vite frontend dev server and the Express backend server.

## Development Workflow

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, following the [Code Style](#code-style) guidelines.

3. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add tool search filtering"
   ```

   We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for test additions or modifications
   - `refactor:` for code refactoring
   - `chore:` for maintenance tasks

4. Push your branch and open a pull request.

## Testing

Run the full test suite before submitting a pull request:

```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Run linting
npm run lint
```

Ensure that:
- All existing tests continue to pass.
- New features include appropriate test coverage.
- Bug fixes include a regression test when possible.

## Pull Request Guidelines

1. Fill out the pull request template completely.
2. Keep pull requests focused on a single change. Split unrelated changes into separate PRs.
3. Ensure the CI pipeline passes (lint, tests, build).
4. Update documentation if your changes affect user-facing behavior.
5. Request a review from `@mcpx/core` once your PR is ready.
6. Be responsive to review feedback and make requested changes promptly.

## Code Style

- Follow the ESLint configuration defined in the project.
- Use meaningful variable and function names.
- Add comments for complex logic, but prefer self-documenting code.
- Keep functions small and focused on a single responsibility.
- Use TypeScript types where applicable.

Run the linter to check your code:

```bash
npm run lint
```

## Questions?

If you have questions or need help, feel free to open a [GitHub Discussion](https://github.com/mcpx/mcpx/discussions) or reach out to the maintainers.

Thank you for contributing!

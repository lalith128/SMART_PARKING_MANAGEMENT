# Contributing Guide

Thank you for your interest in contributing to Smart Parking Management.

## Getting Started

1. Fork the repository.
2. Create a feature branch from `main`.
3. Install dependencies:

```bash
npm install
```

4. Create your local environment file:

```bash
cp .env.example .env
```

5. Run the app:

```bash
npm run dev
```

## Development Workflow

- Keep changes focused and small.
- Prefer descriptive commit messages.
- Update documentation when behavior changes.
- Add or update tests/scripts when possible.

## Quality Checks

Before opening a PR, run:

```bash
npm run lint
npm run build
npm run test:e2e:smoke
```

## Pull Request Guidelines

- Use a clear title and include the purpose of the change.
- Link related issues.
- Include screenshots for UI changes.
- Mention any database migrations and rollout notes.

## Branch and Commit Rules

- Target branch: `main`
- Avoid force-push on shared branches unless explicitly coordinated.
- If you rewrite history, communicate clearly in the PR.

## Security

- Never commit `.env` or secrets.
- Use placeholders in examples and docs.
- Report vulnerabilities privately (see `SECURITY.md`).

## Questions

For help, open a discussion or issue with context, expected behavior, and logs/screenshots.

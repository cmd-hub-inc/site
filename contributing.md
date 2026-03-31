# Contributing

Thanks for your interest in contributing to this project! We welcome bug reports, feature requests, and pull requests. Please follow the guidelines below to make the review process efficient.

## Getting started

- Fork the repository and create a feature branch from `main` named `feature/<short-description>` or `fix/<short-description>`.
- Install dependencies:

  npm install

- Run the development server:

  npm run dev

- Format code using the project's formatter:

  npm run format

This project uses Vite and React. See `package.json` scripts for commands.

## Reporting issues

- Open an issue with a clear title and reproduction steps.
- Include environment details and screenshots or error output where helpful.

## Pull request process

1. Ensure your branch is up to date with `main`.
2. Keep changes focused and small; one logical change per PR.
3. Use descriptive commit messages. Prefer Conventional Commits style (e.g., `feat:`, `fix:`, `chore:`).
4. In your PR description, include:
   - What changed and why
   - How to test the change locally
   - Any relevant screenshots or gifs
5. Add tests where appropriate. If you couldn't add tests, explain why in the PR.

## Code style and quality

- Follow the existing project style. Run `npm run format` before submitting.
- If linting or tests are present, ensure they pass locally.

## Branching and releases

- Work off `main`. Feature branches should be named clearly (see above).
- Pull requests are merged after review and CI checks pass.

## Communication

- If your change is large or architectural, open a draft PR or discuss it in an issue first.

## Questions / Maintainers

If you need help, open an issue and tag `@maintainers` (or add a short question in the repo discussion). Thank you for contributing!

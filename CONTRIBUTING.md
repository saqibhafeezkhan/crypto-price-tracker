# Contributing to Crypto Price Tracker

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 📋 Code of Conduct

Be respectful and inclusive. Treat all contributors with courtesy.

## 🎯 How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/crypto-price-tracker/issues)
2. If not found, open a new issue with:
   - Clear, descriptive title
   - Description of the bug
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Your environment details (OS, Node version, etc.)

### Suggesting Features

1. Open a new issue with the title prefixed with `[FEATURE REQUEST]`
2. Describe the feature and why it would be useful
3. Provide examples of how it would work

### Pull Requests

1. **Fork the repository** and clone it locally
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**:
   - Follow the existing code style
   - Write clear, descriptive commit messages
   - Keep commits atomic and logical
4. **Test your changes**:
   ```bash
   npm run dev
   npm run lint
   npm run format:check
   npm run build
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes
   - List of changes made

## 🎨 Code Style

- Use ES6+ syntax
- Follow the oxlint rules (`npm run lint`)
- Format code with oxfmt (`npm run format`)
- Use meaningful variable and function names
- Add comments for complex logic
- Keep components small and focused

## 📝 Commit Message Guidelines

Use clear, descriptive commit messages:

```
feat: add new feature
fix: resolve issue with feature
docs: update documentation
style: format code
refactor: restructure component
test: add or update tests
chore: update dependencies
```

Example:

```
feat: add multiple currency support to price display

- Add currency selector dropdown
- Update API requests with currency parameter
- Format prices according to selected currency
```

## 🔄 Review Process

1. Maintainers will review your PR
2. Changes may be requested
3. Once approved, your PR will be merged
4. Your contribution will be acknowledged!

## ✅ Development Setup

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📚 Project Structure

Understanding the project structure helps with contributions:

- `/src/components` - Reusable React components
- `/src/pages` - Page-level components
- `/src/context` - React Context for state management
- `/public` - Static files
- `/dist` - Production build (generated)

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for deployment procedures.

## ❓ Questions?

Feel free to open an issue or ask in discussions!

---

Thank you for contributing! 🎉

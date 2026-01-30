# Contributing to OpenHamClock

First off, thank you for considering contributing to OpenHamClock! It's people like you that make the amateur radio community great. 73!

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Issues

- **Bug Reports**: If you find a bug, please create an issue with a clear title and description. Include as much relevant information as possible, including steps to reproduce.
- **Feature Requests**: We welcome feature suggestions! Open an issue describing the feature and why it would be useful.
- **Questions**: Use GitHub Discussions for questions about usage or development.

### Good First Issues

Looking for something to work on? Check out issues labeled [`good first issue`](https://github.com/k0cjh/openhamclock/labels/good%20first%20issue) - these are great for newcomers!

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates. When you create a bug report, include:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs **actual behavior**
- **Screenshots** if applicable
- **Environment details**: OS, browser, Node.js version, Pi model, etc.

### Suggesting Features

We love hearing ideas from the community! When suggesting a feature:

- **Use a clear title** for the issue
- **Provide a detailed description** of the proposed feature
- **Explain the use case** - how would this benefit ham radio operators?
- **Consider implementation** - any ideas on how to build it?

### Priority Contribution Areas

We especially welcome contributions in these areas:

1. **Satellite Tracking**
   - TLE parsing and SGP4 propagation
   - Pass predictions and AOS/LOS times
   - Satellite footprint visualization

2. **Real-time DX Cluster**
   - WebSocket connection to Telnet clusters
   - Spot filtering and alerting
   - Clickable spots to set DX

3. **Contest Integration**
   - Contest calendar from WA7BNM or similar
   - Contest-specific band plans
   - Rate/multiplier tracking

4. **Hardware Integration**
   - Hamlib radio control (frequency, mode)
   - Rotator control
   - External GPIO for Pi (PTT, etc.)

5. **Accessibility**
   - Screen reader support
   - High contrast themes
   - Keyboard navigation

6. **Internationalization**
   - Translation framework
   - Localized date/time formats
   - Multi-language support

## Development Setup

### Prerequisites

- Node.js 18 or later
- Git
- A modern web browser

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/openhamclock.git
cd openhamclock

# Add upstream remote
git remote add upstream https://github.com/k0cjh/openhamclock.git

# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, run Electron (optional)
npm run electron
```

### Project Structure

```
openhamclock/
├── public/index.html    # Main application (React + Leaflet)
├── server.js            # Express API proxy server
├── electron/main.js     # Desktop app wrapper
├── scripts/             # Platform setup scripts
└── package.json         # Dependencies and scripts
```

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Test thoroughly:
   - Test in multiple browsers (Chrome, Firefox, Safari)
   - Test on desktop and mobile viewports
   - Test the Electron app if applicable
   - Verify API proxy endpoints work

4. Commit with clear messages:
   ```bash
   git commit -m "Add satellite tracking panel with TLE parser"
   ```

## Pull Request Process

1. **Update documentation** if needed (README, inline comments)

2. **Ensure your code follows style guidelines** (see below)

3. **Test your changes** on multiple platforms if possible

4. **Create the Pull Request**:
   - Use a clear, descriptive title
   - Reference any related issues (`Fixes #123`)
   - Describe what changes you made and why
   - Include screenshots for UI changes

5. **Respond to feedback** - maintainers may request changes

6. **Once approved**, a maintainer will merge your PR

### PR Title Format

Use conventional commit style:
- `feat: Add satellite tracking panel`
- `fix: Correct timezone calculation for DST`
- `docs: Update Pi installation instructions`
- `style: Improve mobile responsive layout`
- `refactor: Simplify API proxy endpoints`

## Style Guidelines

### JavaScript

- Use modern ES6+ syntax
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

### CSS

- Use CSS custom properties (variables) for theming
- Follow the existing naming conventions
- Prefer flexbox/grid over floats
- Test responsive breakpoints

### React Components

- Use functional components with hooks
- Keep components focused on single responsibilities
- Extract reusable logic into custom hooks
- Use meaningful prop names

### Git Commits

- Write clear, concise commit messages
- Use present tense ("Add feature" not "Added feature")
- Reference issues when applicable

## Recognition

Contributors will be recognized in:
- The README contributors section
- Release notes for significant contributions
- The project's GitHub contributors page

## Questions?

Feel free to:
- Open a GitHub Discussion
- Reach out to maintainers
- Join the amateur radio community discussions

---

**73 and thanks for contributing to OpenHamClock!**

*In memory of Elwood Downey, WB0OEW*

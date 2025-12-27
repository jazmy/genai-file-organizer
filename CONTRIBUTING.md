# Contributing to GenAI File Organizer

Thank you for your interest in contributing to GenAI File Organizer! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm run install:all`
4. Create a branch for your changes: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites

- Node.js 18+
- One of the following AI providers:
  - [Ollama](https://ollama.ai/) with a vision model (e.g., `llama3.2-vision`, `llava`)
  - [llama.cpp](https://github.com/ggerganov/llama.cpp) with llama-server

### Running the Development Environment

1. Copy configuration examples:
   ```bash
   cp config/config.example.json config/config.json
   cp client/.env.example client/.env.local
   ```

2. Start the backend server:
   ```bash
   npm run dev:server
   ```

3. Start the web client (in another terminal):
   ```bash
   npm run web
   ```

4. Open http://localhost:3000 in your browser

## Code Style

- Use consistent formatting (the project uses Prettier defaults)
- Follow existing patterns in the codebase
- Write meaningful commit messages
- Add comments for complex logic

## Pull Request Process

1. Ensure your code follows the existing style
2. Update documentation if needed
3. Test your changes locally
4. Create a pull request with a clear description of the changes
5. Link any related issues

## Reporting Issues

When reporting issues, please include:

- Description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, AI provider)
- Relevant logs or screenshots

## Feature Requests

Feature requests are welcome! Please:

- Check if the feature has already been requested
- Provide a clear use case
- Describe the expected behavior

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## Questions?

Feel free to open an issue for any questions about contributing.

Thank you for helping improve GenAI File Organizer!

# GenOrganize Client

Web-based UI for GenOrganize - an AI-powered file organizer.

## Overview

This is the frontend for GenOrganize, built with Next.js 14, React, and Tailwind CSS. It provides a modern, responsive interface for managing and organizing files using AI-powered naming suggestions.

## Features

- File browser with grid and list views
- Real-time processing status via WebSocket
- Preview support for images and documents
- History panel with undo/redo support
- Settings management
- Dark/light theme support
- Keyboard shortcuts

## Getting Started

### Prerequisites

- Node.js 18+
- GenOrganize server running on port 3001

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |

## Project Structure

```
client/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   │   ├── files/        # File browser components
│   │   ├── layout/       # Layout components
│   │   ├── modals/       # Modal dialogs
│   │   ├── panels/       # Side panels
│   │   ├── providers/    # Context providers
│   │   └── ui/           # UI primitives
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API client
│   ├── stores/           # Zustand state stores
│   └── types/            # TypeScript types
├── public/               # Static assets
└── package.json
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS
- **State:** Zustand
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Real-time:** Socket.io Client

## License

MIT

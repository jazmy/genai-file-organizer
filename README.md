# GenOrganize

AI-powered local file organizer using Ollama. Automatically rename and organize files based on their content analysis.

## Features

- **🤖 Local AI Processing** - Uses Ollama with qwen2-vl:8b (vision-language model) for 100% offline processing
- **📁 Smart Renaming** - Analyzes file content to generate descriptive, consistent filenames
- **🗂️ Auto-Filing** - Optionally moves files to folders based on content type (disabled by default)
- **👁️ Vision Analysis** - Understands images, screenshots, and scanned documents
- **🎵 Audio/Video Support** - Metadata extraction with optional Whisper transcription
- **📺 Watch Mode** - Monitors folders and processes new files automatically
- **🌐 Web UI** - Beautiful browser-based interface for easy file management
- **⌨️ CLI** - Powerful command-line interface for automation

## Supported File Types

| Category | Extensions |
|----------|------------|
| Documents | PDF, DOCX, RTF, TXT, HTML, MD |
| Spreadsheets | XLSX, XLS, CSV, TSV |
| Presentations | PPTX, PPT |
| Code | PY, JS, TS, JSON, CSS, HTML |
| Images | PNG, JPG, JPEG, GIF, WEBP, HEIC, SVG |
| Design | PSD, AI, XD, Sketch |
| Audio | MP3, WAV, FLAC, M4A, AAC |
| Video | MP4, MOV, AVI, MKV, WEBM |
| Archives | ZIP, DMG, TAR, GZ, RAR |
| Fonts | TTF, OTF, WOFF, WOFF2 |
| Calendar | ICS, ICAL |

## Prerequisites

- **Node.js 18+** - [Install Node.js](https://nodejs.org/)
- **LLM Backend** (choose one):
  - **Ollama** - [Install Ollama](https://ollama.ai) - Easiest setup, recommended for beginners
  - **llama-server** - [llama.cpp](https://github.com/ggerganov/llama.cpp) - Better for parallel processing
- **Git** - For cloning the repository
- **ffmpeg** (optional, for video processing)

## Fresh Machine Setup

Follow these steps to set up GenOrganize on a new machine.

### 1. Install Homebrew (macOS only)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js

```bash
# macOS (using Homebrew)
brew install node

# Or download from https://nodejs.org/ (LTS version recommended)

# Verify installation
node --version  # Should be 18.0.0 or higher
npm --version
```

### 3. Install Ollama

```bash
# macOS (using Homebrew)
brew install ollama

# Or download from https://ollama.ai

# Start Ollama service (keep this running in a terminal or run as background service)
ollama serve

# Pull the vision-language model (in a new terminal)
ollama pull qwen3-vl:8b

# Verify the model is installed
ollama list
```

### 4. Alternative: Install llama-server (Optional)

If you prefer llama-server over Ollama for better parallel processing:

```bash
# macOS (using Homebrew)
brew install llama.cpp

# Create models directory
mkdir -p ~/models
```

**Setting up models (one-time setup):**

The easiest approach is to use Ollama to download models, then symlink them for llama-server:

```bash
# Pull LLaVA via Ollama (downloads both model and vision projector)
ollama pull llava:7b

# Find the model files (look for the largest files)
ls -la ~/.ollama/models/blobs/

# Create symlinks (replace sha256 hashes with actual values from ls output)
# The main model is ~4GB, the mmproj is ~600MB
ln -s ~/.ollama/models/blobs/sha256-<large-model-hash> ~/models/llava-1.6-mistral-7b.gguf
ln -s ~/.ollama/models/blobs/sha256-<smaller-mmproj-hash> ~/models/llava-mmproj.gguf
```

**Quick tip:** To find the correct hashes, look for:
- Main model: ~4GB file (the largest one after pulling llava:7b)
- Vision projector (mmproj): ~600MB file

**Starting llama-server:**

```bash
# Easy way - use the npm script (after setting up models)
npm run llama-server

# Or manually with full options:
llama-server \
  -m ~/models/llava-1.6-mistral-7b.gguf \
  --mmproj ~/models/llava-mmproj.gguf \
  --host 127.0.0.1 \
  --port 8080 \
  -np 4 \
  -cb \
  -c 16384

# Verify it's running
curl http://127.0.0.1:8080/health
```

**Important llama-server flags:**

| Flag | Description |
|------|-------------|
| `-m` | Path to the main model file (GGUF format) |
| `--mmproj` | Path to multimodal projector (required for vision) |
| `--host` | Host to bind to (default: 127.0.0.1) |
| `--port` | Port to listen on (default: 8080) |
| `-np` | Number of parallel slots (concurrent requests) |
| `-cb` | Enable continuous batching |
| `-c` | Context size (total tokens, divided among slots) |
| `--mlock` | Lock model in RAM (prevents swapping) |

**Context size tip:** With `-np 4` and `-c 16384`, each slot gets 4096 tokens. For vision tasks with validation, use at least `-c 16384` to avoid "context size exceeded" errors.

### 5. Install ffmpeg (Optional - for video processing)

```bash
# macOS
brew install ffmpeg

# Verify installation
ffmpeg -version
```

### 6. Install Whisper (Optional - for audio/video transcription)

Whisper is required if you want to transcribe audio files or video audio tracks instead of just extracting metadata.

```bash
# Option 1: Install whisper.cpp via Homebrew (recommended)
brew install whisper-cpp

# Download a Whisper model (base model is a good balance of speed/accuracy)
whisper-cpp --download-model base

# Option 2: Use Whisper through Ollama (if you prefer)
# Ollama can run Whisper models - check Ollama documentation for available models

# Verify installation
whisper-cpp --help
```

**Available Whisper models:**

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| `tiny` | 75 MB | Fastest | Lower |
| `base` | 142 MB | Fast | Good |
| `small` | 466 MB | Medium | Better |
| `medium` | 1.5 GB | Slow | High |
| `large` | 2.9 GB | Slowest | Highest |

### 7. Clone and Install GenOrganize

```bash
# Clone the repository
git clone https://github.com/yourusername/genorganize.git
cd genorganize

# Install all dependencies (server + client)
npm run install:all

# Or install separately:
cd server && npm install
cd ../client && npm install
```

### 8. Configure Environment

```bash
# Copy the server environment file
cp server/.env.example server/.env

# Copy the config file
cp config/genorganize.config.example.json config/genorganize.config.json

# Create client environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > client/.env.local
```

**Note:** The `config/genorganize.config.json` and `data/genorganize.db` files are gitignored to protect your personal file history and settings. Each user should create their own config from the example file.

**Server environment variables** (`server/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen3-vl:8b` | Vision-language model to use |
| `PORT` | `3001` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `MAX_CONTENT_LENGTH` | `25000` | Max content length for AI processing |
| `SKIP_AUDIO` | `false` | Skip audio file processing |
| `SKIP_VIDEO` | `false` | Skip video file processing |
| `AUDIO_MODE` | `metadata` | Audio processing mode (metadata\|transcribe) |
| `VIDEO_MODE` | `keyframes` | Video processing mode (metadata\|keyframes\|transcribe) |

### 9. Verify Setup

```bash
# Check that everything is configured correctly
npm run doctor
```

### 10. Run GenOrganize

#### CLI Mode

```bash
# Process a single file (preview mode)
npm run cli -- process ./Downloads/document.pdf --dry-run

# Process a directory
npm run cli -- process ./Downloads --recursive --dry-run

# Apply changes (actually rename files)
npm run cli -- process ./Downloads --recursive

# Watch a folder for new files
npm run cli -- watch ./Inbox

# Check system status
npm run cli -- doctor
```

#### Web UI Mode

**With Ollama (default):**
```bash
# Terminal 1: Start the API server
npm run server

# Terminal 2: Start the web UI
npm run web

# Open http://localhost:3000 in your browser
```

**With llama-server (for better parallel processing):**
```bash
# Terminal 1: Start llama-server
npm run llama-server

# Terminal 2: Start the API server
npm run server

# Terminal 3: Start the web UI
npm run web

# Open http://localhost:3000 in your browser
# Then go to Settings and change Provider to "llama-server"
```

## CLI Commands

```bash
# Process files
genorganize process <path> [options]
  -r, --recursive     Process directories recursively
  -d, --dry-run       Preview changes without applying
  -m, --move          Move files to organized folders
  --skip-audio        Skip audio files
  --skip-video        Skip video files
  --audio-mode        Audio processing mode (metadata|transcribe)
  --video-mode        Video processing mode (metadata|keyframes|transcribe)

# Watch folders
genorganize watch [directories...] [options]
  -d, --dry-run       Preview changes without applying
  -m, --move          Move files to organized folders
  -p, --processed     Move processed files to this folder

# View history
genorganize history [options]
  -n, --limit         Number of entries to show
  -a, --all           Include undone entries

# Undo a rename
genorganize undo <historyId>

# System check
genorganize doctor

# Configuration
genorganize config --init    # Create config file
genorganize config --show    # Show current config
```

## Configuration

Create `genorganize.config.json` in your project root:

```json
{
  "provider": {
    "type": "ollama"
  },
  "ollama": {
    "host": "http://localhost:11434",
    "model": "qwen3-vl:8b"
  },
  "llamaServer": {
    "host": "http://127.0.0.1:8080",
    "parallelSlots": 4
  },
  "processing": {
    "skipAudio": false,
    "skipVideo": false,
    "audioMode": "metadata",
    "videoMode": "keyframes"
  },
  "folders": {
    "enabled": true,
    "rules": [
      { "type": "invoice", "destination": "./Invoices" },
      { "type": "screenshot", "destination": "./Screenshots" },
      { "type": "document", "destination": "./Documents" }
    ]
  },
  "watch": {
    "directories": ["./Inbox"],
    "processedFolder": "./Processed"
  }
}
```

## Naming Convention

Files are renamed using this format:
```
[category]_[primary_descriptor]_[secondary_details]_[date].[ext]
```

### Category Prefixes

| Prefix | Type |
|--------|------|
| `doc_` | General documents |
| `inv_` | Invoices, receipts |
| `ss_` | Screenshots |
| `img_` | Photos, graphics |
| `code_` | Source code |
| `vid_` | Videos |
| `aud_` | Audio files |
| `legal_` | Contracts, agreements |
| `tax_` | Tax documents |
| `bank_` | Financial statements |

### Examples

```
inv_amazon_order-details_2025-03-12.pdf
ss_github_pull-request-error.png
doc_quarterly-report_q1-2025_draft.docx
img_golden-retriever_beach-sunset.jpg
code_python_data-scraper-v2.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/config` | Get configuration |
| POST | `/api/config` | Save configuration |
| GET | `/api/ollama/status` | Check Ollama connection |
| POST | `/api/process/file` | Process a single file |
| POST | `/api/process/directory` | Process a directory |
| POST | `/api/apply` | Apply pending changes |
| GET | `/api/history` | Get processing history |
| POST | `/api/undo/:id` | Undo a rename |
| GET | `/api/files` | List files in directory |
| GET | `/api/watch/status` | Get watcher status |
| POST | `/api/watch/start` | Start file watcher |
| POST | `/api/watch/stop` | Stop file watcher |

## Project Structure

```
genorganize/
├── server/               # Backend (Node.js + Express)
│   ├── index.js          # Main exports
│   ├── cli.js            # CLI interface
│   ├── server.js         # Express API server
│   ├── config/           # Configuration
│   ├── core/             # Core logic (processor, organizer, watcher)
│   ├── extractors/       # File content extractors
│   ├── ai/               # Ollama integration
│   ├── actions/          # File actions (rename, move)
│   └── utils/            # Utilities
├── client/               # Frontend (Next.js + React)
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── lib/              # API client
├── config/               # User configuration
├── package.json
├── .env.example
└── README.md
```

## Troubleshooting

### Ollama not connecting

```bash
# Make sure Ollama is running
ollama serve

# Check if model is installed
ollama list

# Pull the model if missing
ollama pull qwen2-vl:8b
```

### Video processing not working

```bash
# Install ffmpeg
brew install ffmpeg

# Verify installation
ffmpeg -version
```

### Permission errors

Make sure you have read/write permissions for the directories you're processing.

### llama-server issues

```bash
# Check if llama-server is running
curl http://127.0.0.1:8080/health

# "image input is not supported" error
# You need to provide the --mmproj flag with the vision encoder file
llama-server -m model.gguf --mmproj mmproj.gguf ...

# "context size exceeded" error
# Increase the context size (divide by parallel slots for per-request limit)
llama-server ... -c 16384 -np 4  # Each slot gets 4096 tokens

# Model architecture not supported
# Use models with llama.cpp support (LLaVA works well, newer Qwen VL may not)
ollama pull llava:7b
```

## Choosing Between Ollama and llama-server

| Feature | Ollama | llama-server |
|---------|--------|--------------|
| Setup | Easy (one command) | Manual (need model files) |
| Model switching | Per-request | Fixed at startup |
| Parallel requests | Limited | Excellent (`-np` flag) |
| Continuous batching | No | Yes (`-cb` flag) |
| Memory efficiency | Good | Better for concurrent use |
| Vision support | Built-in | Requires `--mmproj` file |

**Recommendation:**
- Use **Ollama** if you're getting started or want easy model management
- Use **llama-server** if you need high concurrency or better parallel processing

## License

MIT

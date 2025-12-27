import Link from 'next/link';

export default function InstallationPage() {
  return (
    <div className="docs-content">
      <h1>Installation</h1>
      <p className="lead">
        Get GenAI File Organizer up and running on your system. This guide covers system requirements, installation steps, and initial configuration.
      </p>

      <h2>System Requirements</h2>
      <h3>Minimum Requirements</h3>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Requirement</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>Operating System</strong></td><td>macOS 12+, Linux, Windows 10+</td></tr>
          <tr><td><strong>Node.js</strong></td><td>18.0.0 or higher</td></tr>
          <tr><td><strong>RAM</strong></td><td>8 GB minimum (16 GB recommended)</td></tr>
          <tr><td><strong>Storage</strong></td><td>5 GB free space</td></tr>
          <tr><td><strong>Ollama</strong></td><td>Latest version</td></tr>
        </tbody>
      </table>

      <h3>Required Dependencies</h3>
      <ul>
        <li><strong>Node.js 18+</strong> - JavaScript runtime</li>
        <li><strong>npm</strong> - Package manager (comes with Node.js)</li>
        <li><strong>LLM Backend</strong> - Choose one:
          <ul>
            <li><strong>Ollama</strong> - Easy setup, recommended for beginners</li>
            <li><strong>llama-server</strong> - Better parallel processing (from llama.cpp)</li>
          </ul>
        </li>
        <li><strong>Vision-language model</strong> - e.g., qwen3-vl:8b (Ollama) or LLaVA (llama-server)</li>
      </ul>

      <h3>Optional Dependencies</h3>
      <ul>
        <li><strong>ffmpeg</strong> - Video processing and keyframe extraction</li>
        <li><strong>whisper.cpp</strong> - Audio transcription</li>
      </ul>

      <h2>Quick Install</h2>
      <pre><code>{`# Clone the repository
git clone <repository-url>
cd genorganize

# Install all dependencies
npm run install:all

# Configure environment
cp server/.env.example server/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > client/.env.local

# Verify setup
npm run doctor`}</code></pre>

      <h2>Step-by-Step Installation</h2>

      <h3>Step 1: Install Node.js</h3>
      <p>Download and install Node.js 18+ from <a href="https://nodejs.org" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">nodejs.org</a> or use a version manager:</p>
      <pre><code>{`# Using nvm (recommended)
nvm install 18
nvm use 18

# Verify installation
node --version  # Should be v18.x.x or higher`}</code></pre>

      <h3>Step 2: Install Ollama</h3>
      <h4>macOS</h4>
      <pre><code>{`# Using Homebrew
brew install ollama

# Or download from ollama.ai
# https://ollama.ai/download`}</code></pre>

      <h4>Linux</h4>
      <pre><code>{`curl -fsSL https://ollama.ai/install.sh | sh`}</code></pre>

      <h4>Windows</h4>
      <p>Download the installer from <a href="https://ollama.ai/download" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">ollama.ai/download</a></p>

      <h3>Step 3: Start Ollama</h3>
      <pre><code>{`# Start the Ollama service
ollama serve

# In a new terminal, pull a fast vision model (recommended)
ollama pull moondream

# Or pull a higher quality model
ollama pull qwen3-vl:8b

# Verify the model is installed
ollama list`}</code></pre>

      <h3>Step 3 (Alternative): Install llama-server</h3>
      <p>If you prefer llama-server for better parallel processing:</p>
      <pre><code>{`# macOS (using Homebrew)
brew install llama.cpp

# Create a models directory
mkdir -p ~/models`}</code></pre>

      <h4>Setting Up Models (One-Time Setup)</h4>
      <p>The easiest approach is to use Ollama to download models, then symlink them for llama-server:</p>
      <pre><code>{`# Pull LLaVA via Ollama (downloads both model and vision projector)
ollama pull llava:7b

# Find the model files (look for the largest files)
ls -la ~/.ollama/models/blobs/

# Create symlinks (replace sha256 hashes with actual values)
# Main model is ~4GB, mmproj is ~600MB
ln -s ~/.ollama/models/blobs/sha256-<large-model-hash> ~/models/llava-1.6-mistral-7b.gguf
ln -s ~/.ollama/models/blobs/sha256-<smaller-mmproj-hash> ~/models/llava-mmproj.gguf`}</code></pre>
      <p><strong>Quick tip:</strong> Look for the largest file (~4GB) for the main model, and a ~600MB file for the vision projector.</p>

      <h4>Starting llama-server</h4>
      <pre><code>{`# Easy way - use the npm script (after setting up models)
npm run llama-server

# Or manually with full options:
llama-server \\
  -m ~/models/llava-1.6-mistral-7b.gguf \\
  --mmproj ~/models/llava-mmproj.gguf \\
  --host 127.0.0.1 \\
  --port 8080 \\
  -np 4 \\
  -cb \\
  -c 16384

# Verify it's running
curl http://127.0.0.1:8080/health`}</code></pre>

      <h4>Important llama-server Flags</h4>
      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>-m</code></td><td>Path to main model file (GGUF format)</td></tr>
          <tr><td><code>--mmproj</code></td><td>Path to multimodal projector (required for vision)</td></tr>
          <tr><td><code>--host</code></td><td>Host to bind to (default: 127.0.0.1)</td></tr>
          <tr><td><code>--port</code></td><td>Port to listen on (default: 8080)</td></tr>
          <tr><td><code>-np</code></td><td>Number of parallel slots (concurrent requests)</td></tr>
          <tr><td><code>-cb</code></td><td>Enable continuous batching</td></tr>
          <tr><td><code>-c</code></td><td>Context size (total tokens, divided among slots)</td></tr>
          <tr><td><code>--mlock</code></td><td>Lock model in RAM (prevents swapping)</td></tr>
        </tbody>
      </table>
      <p><strong>Context size tip:</strong> With <code>-np 4</code> and <code>-c 16384</code>, each slot gets 4096 tokens. For vision tasks with validation, use at least <code>-c 16384</code>.</p>

      <h3>Step 4: Clone & Install GenAI File Organizer</h3>
      <pre><code>{`# Clone the repository
git clone <repository-url>
cd genorganize

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Or install both at once from root
cd ..
npm run install:all`}</code></pre>

      <h3>Step 5: Configure Environment</h3>
      <p>Create environment files:</p>
      <pre><code>{`# Server environment
cp server/.env.example server/.env

# Client environment
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > client/.env.local`}</code></pre>

      <h3>Step 6: Verify Installation</h3>
      <pre><code>{`# Run the doctor command
npm run doctor`}</code></pre>
      <p>This checks:</p>
      <ul>
        <li>Node.js version</li>
        <li>Ollama connection</li>
        <li>Model availability</li>
        <li>Optional dependencies</li>
      </ul>

      <h3>Step 7: Start the Application</h3>
      <p><strong>With Ollama (default):</strong></p>
      <pre><code>{`# Terminal 1: Start the API server
npm run server

# Terminal 2: Start the web UI
npm run web

# Open http://localhost:3000 in your browser`}</code></pre>

      <p><strong>With llama-server (for better parallel processing):</strong></p>
      <pre><code>{`# Terminal 1: Start llama-server
npm run llama-server

# Terminal 2: Start the API server
npm run server

# Terminal 3: Start the web UI
npm run web

# Open http://localhost:3000 in your browser
# Then go to Settings and change Provider to "llama-server"`}</code></pre>

      <h2>Installing Optional Dependencies</h2>

      <h3>ffmpeg (Video Processing)</h3>
      <pre><code>{`# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows (using Chocolatey)
choco install ffmpeg`}</code></pre>

      <h3>whisper.cpp (Audio Transcription)</h3>
      <pre><code>{`# macOS
brew install whisper-cpp
whisper-cpp --download-model base

# Linux
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
./models/download-ggml-model.sh base`}</code></pre>

      <h2>Alternative Models</h2>
      <p>You can use different vision-language models:</p>
      <table>
        <thead>
          <tr>
            <th>Model</th>
            <th>Size</th>
            <th>Speed</th>
            <th>Quality</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>moondream</code></td>
            <td>~1.8GB</td>
            <td>Very Fast</td>
            <td>Good</td>
          </tr>
          <tr>
            <td><code>llava:7b</code></td>
            <td>~4GB</td>
            <td>Fast</td>
            <td>Good</td>
          </tr>
          <tr>
            <td><code>qwen3-vl:8b</code></td>
            <td>~5GB</td>
            <td>Medium</td>
            <td>Better</td>
          </tr>
          <tr>
            <td><code>llava:13b</code></td>
            <td>~8GB</td>
            <td>Slow</td>
            <td>Best</td>
          </tr>
        </tbody>
      </table>
      <p><strong>Recommended:</strong> Use <code>moondream</code> for 4x faster processing with good accuracy. Install with:</p>
      <pre><code>{`ollama pull moondream`}</code></pre>

      <h2>Troubleshooting Installation</h2>

      <h3>Node.js Version Issues</h3>
      <pre><code>{`# Check your version
node --version

# If below v18, upgrade
nvm install 18
nvm use 18`}</code></pre>

      <h3>Ollama Not Found</h3>
      <pre><code>{`# Check if installed
which ollama

# Check if running
curl http://localhost:11434/api/tags`}</code></pre>

      <h3>Model Download Fails</h3>
      <pre><code>{`# Check disk space
df -h

# Try a smaller model
ollama pull llava:7b`}</code></pre>

      <h3>Permission Issues</h3>
      <pre><code>{`# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use nvm which doesn't require sudo
nvm install 18`}</code></pre>

      <h3>llama-server Issues</h3>
      <pre><code>{`# Check if llama-server is running
curl http://127.0.0.1:8080/health

# Start llama-server using npm script
npm run llama-server

# "image input is not supported" error
# You need the --mmproj flag with the vision encoder file
llama-server -m model.gguf --mmproj mmproj.gguf ...

# "context size exceeded" error
# Increase context size (divided by parallel slots)
llama-server ... -c 16384 -np 4  # Each slot gets 4096 tokens

# Model architecture not supported
# Use models with llama.cpp support (LLaVA works, newer Qwen VL may not)
ollama pull llava:7b`}</code></pre>

      <h2>Choosing Between Ollama and llama-server</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Ollama</th>
            <th>llama-server</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Setup</td><td>Easy (one command)</td><td>Manual (need model files)</td></tr>
          <tr><td>Model switching</td><td>Per-request</td><td>Fixed at startup</td></tr>
          <tr><td>Parallel requests</td><td>Limited</td><td>Excellent (<code>-np</code> flag)</td></tr>
          <tr><td>Continuous batching</td><td>No</td><td>Yes (<code>-cb</code> flag)</td></tr>
          <tr><td>Memory efficiency</td><td>Good</td><td>Better for concurrent use</td></tr>
          <tr><td>Vision support</td><td>Built-in</td><td>Requires <code>--mmproj</code> file</td></tr>
        </tbody>
      </table>
      <p><strong>Recommendation:</strong></p>
      <ul>
        <li>Use <strong>Ollama</strong> if you&apos;re getting started or want easy model management</li>
        <li>Use <strong>llama-server</strong> if you need high concurrency or better parallel processing</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/admin/configuration" className="text-blue-500 hover:underline">
            Configuration
          </Link>{' '}
          - Set up environment variables and options
        </li>
        <li>
          <Link href="/docs/user/getting-started" className="text-blue-500 hover:underline">
            Getting Started
          </Link>{' '}
          - Process your first files
        </li>
      </ul>
    </div>
  );
}

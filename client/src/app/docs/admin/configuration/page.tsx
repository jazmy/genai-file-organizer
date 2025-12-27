import Link from 'next/link';

export default function ConfigurationPage() {
  return (
    <div className="docs-content">
      <h1>Configuration</h1>
      <p className="lead">
        Configure GenAI File Organizer using environment variables and configuration files. This guide covers all available options.
      </p>

      <h2>Server Environment Variables</h2>
      <p>Create or edit <code>server/.env</code>:</p>

      <h3>Core Settings</h3>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>PORT</code></td>
            <td><code>3001</code></td>
            <td>API server port</td>
          </tr>
          <tr>
            <td><code>NODE_ENV</code></td>
            <td><code>development</code></td>
            <td>Environment mode (development/production)</td>
          </tr>
          <tr>
            <td><code>LOG_LEVEL</code></td>
            <td><code>info</code></td>
            <td>Logging verbosity (debug/info/warn/error)</td>
          </tr>
        </tbody>
      </table>

      <h3>AI Provider Settings</h3>
      <p>GenAI File Organizer supports two LLM backends: Ollama and llama-server. Configure in the web UI under Settings → AI Provider.</p>

      <h4>Ollama Settings</h4>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>OLLAMA_HOST</code></td>
            <td><code>http://localhost:11434</code></td>
            <td>Ollama API endpoint</td>
          </tr>
          <tr>
            <td><code>OLLAMA_MODEL</code></td>
            <td><code>qwen3-vl:8b</code></td>
            <td>Vision-language model for analysis</td>
          </tr>
          <tr>
            <td><code>OLLAMA_TIMEOUT</code></td>
            <td><code>120000</code></td>
            <td>Request timeout in milliseconds</td>
          </tr>
        </tbody>
      </table>

      <h4>llama-server Settings</h4>
      <p>Configure these in the web UI when using llama-server as your provider:</p>
      <table>
        <thead>
          <tr>
            <th>Setting</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>host</code></td>
            <td><code>http://127.0.0.1:8080</code></td>
            <td>llama-server API endpoint</td>
          </tr>
          <tr>
            <td><code>parallelSlots</code></td>
            <td><code>4</code></td>
            <td>Match with your <code>-np</code> flag</td>
          </tr>
        </tbody>
      </table>
      <p><strong>Note:</strong> llama-server uses whichever model you loaded at startup. Model selection is not available per-request like with Ollama.</p>

      <h3>Processing Settings</h3>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>SKIP_AUDIO</code></td>
            <td><code>false</code></td>
            <td>Skip audio file processing</td>
          </tr>
          <tr>
            <td><code>SKIP_VIDEO</code></td>
            <td><code>false</code></td>
            <td>Skip video file processing</td>
          </tr>
          <tr>
            <td><code>AUDIO_MODE</code></td>
            <td><code>metadata</code></td>
            <td>Audio analysis mode (metadata/transcribe)</td>
          </tr>
          <tr>
            <td><code>VIDEO_MODE</code></td>
            <td><code>keyframes</code></td>
            <td>Video analysis mode (metadata/keyframes/transcribe)</td>
          </tr>
          <tr>
            <td><code>BATCH_SIZE</code></td>
            <td><code>5</code></td>
            <td>Number of files to process in parallel</td>
          </tr>
        </tbody>
      </table>

      <h3>Rate Limiting Settings</h3>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>RATE_LIMIT_ENABLED</code></td>
            <td><code>true</code></td>
            <td>Enable rate limiting</td>
          </tr>
          <tr>
            <td><code>RATE_LIMIT_MAX_TOKENS</code></td>
            <td><code>10</code></td>
            <td>Burst capacity</td>
          </tr>
          <tr>
            <td><code>RATE_LIMIT_REFILL_RATE</code></td>
            <td><code>2</code></td>
            <td>Tokens per second</td>
          </tr>
          <tr>
            <td><code>RATE_LIMIT_MAX_QUEUE</code></td>
            <td><code>100</code></td>
            <td>Max queued requests</td>
          </tr>
          <tr>
            <td><code>RATE_LIMIT_TIMEOUT</code></td>
            <td><code>60000</code></td>
            <td>Request timeout (ms)</td>
          </tr>
        </tbody>
      </table>

      <h3>Example .env File</h3>
      <pre><code>{`# Server Configuration
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=moondream
OLLAMA_TIMEOUT=120000

# Processing Options
SKIP_AUDIO=false
SKIP_VIDEO=false
AUDIO_MODE=metadata
VIDEO_MODE=keyframes
BATCH_SIZE=5

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_TOKENS=10
RATE_LIMIT_REFILL_RATE=2
RATE_LIMIT_MAX_QUEUE=100`}</code></pre>

      <h2>Client Environment Variables</h2>
      <p>Create or edit <code>client/.env.local</code>:</p>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>NEXT_PUBLIC_API_URL</code></td>
            <td><code>http://localhost:3001</code></td>
            <td>API server URL</td>
          </tr>
        </tbody>
      </table>

      <h2>Application Configuration</h2>
      <p>Create <code>genorganize.config.json</code> in the server directory for advanced configuration:</p>
      <pre><code>{`{
  "provider": {
    "type": "ollama"
  },
  "ollama": {
    "host": "http://localhost:11434",
    "model": "qwen3-vl:8b",
    "timeout": 120000
  },
  "llamaServer": {
    "host": "http://127.0.0.1:8080",
    "parallelSlots": 4,
    "timeout": 180000
  },
  "processing": {
    "skipAudio": false,
    "skipVideo": false,
    "audioMode": "metadata",
    "videoMode": "keyframes",
    "batchSize": 5,
    "parallelProcessing": 3
  },
  "folders": {
    "enabled": true,
    "createMissing": true,
    "rules": [
      { "type": "invoice", "destination": "./Invoices" },
      { "type": "screenshot", "destination": "./Screenshots" },
      { "type": "document", "destination": "./Documents" }
    ]
  },
  "logging": {
    "level": "info",
    "retention": 30
  }
}`}</code></pre>

      <h2>Configuration Sections</h2>

      <h3>provider</h3>
      <p>LLM backend selection:</p>
      <ul>
        <li><code>type</code>: Choose <code>&quot;ollama&quot;</code> or <code>&quot;llama-server&quot;</code></li>
      </ul>

      <h3>ollama</h3>
      <p>Ollama-specific configuration (when provider.type is &quot;ollama&quot;):</p>
      <ul>
        <li><code>host</code>: Ollama API URL</li>
        <li><code>model</code>: Default model name for analysis</li>
        <li><code>categorizationModel</code>: Model for file categorization (optional)</li>
        <li><code>namingModel</code>: Model for filename generation (optional)</li>
        <li><code>regenerationModel</code>: Model for regeneration (optional)</li>
        <li><code>timeout</code>: Request timeout in ms</li>
      </ul>

      <h3>llamaServer</h3>
      <p>llama-server configuration (when provider.type is &quot;llama-server&quot;):</p>
      <ul>
        <li><code>host</code>: llama-server API URL (default: http://127.0.0.1:8080)</li>
        <li><code>parallelSlots</code>: Should match your <code>-np</code> startup flag</li>
        <li><code>timeout</code>: Request timeout in ms (vision takes longer)</li>
      </ul>
      <p><strong>Note:</strong> llama-server uses the model loaded at startup. To change models, restart llama-server with a different <code>-m</code> path.</p>

      <h3>processing</h3>
      <p>File processing options:</p>
      <ul>
        <li><code>skipAudio</code>: Skip audio files entirely</li>
        <li><code>skipVideo</code>: Skip video files entirely</li>
        <li><code>audioMode</code>: How to analyze audio (metadata or transcribe)</li>
        <li><code>videoMode</code>: How to analyze video (metadata, keyframes, or transcribe)</li>
        <li><code>batchSize</code>: Files per batch</li>
        <li><code>parallelProcessing</code>: Concurrent file processing</li>
      </ul>

      <h3>folders</h3>
      <p>Auto-organization settings:</p>
      <ul>
        <li><code>enabled</code>: Enable auto-organization</li>
        <li><code>createMissing</code>: Create folders if they don&apos;t exist</li>
        <li><code>rules</code>: Array of type-to-folder mappings</li>
      </ul>

      <h3>logging</h3>
      <p>Logging configuration:</p>
      <ul>
        <li><code>level</code>: Log verbosity (debug/info/warn/error)</li>
        <li><code>retention</code>: Days to keep logs</li>
      </ul>

      <h2>Database Configuration</h2>
      <p>GenAI File Organizer uses SQLite by default. The database file is stored at:</p>
      <pre><code>server/data/genorganize.db</code></pre>

      <h3>Database Migrations</h3>
      <pre><code>{`# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback`}</code></pre>

      <h2>Production Configuration</h2>
      <p>For production deployments:</p>
      <pre><code>{`# server/.env
NODE_ENV=production
LOG_LEVEL=warn
PORT=3001

# Build the client
cd client
npm run build

# Start production server
npm run start`}</code></pre>

      <h2>Remote Ollama</h2>
      <p>To use Ollama on a different machine:</p>
      <pre><code>{`# On the remote machine, start Ollama with network binding
OLLAMA_HOST=0.0.0.0 ollama serve

# In your .env, point to the remote machine
OLLAMA_HOST=http://192.168.1.100:11434`}</code></pre>

      <h2>Remote llama-server</h2>
      <p>To use llama-server on a different machine:</p>
      <pre><code>{`# On the remote machine, start llama-server with network binding
llama-server \\
  -m ~/models/llava-7b.gguf \\
  --mmproj ~/models/llava-mmproj.gguf \\
  --host 0.0.0.0 \\
  --port 8080 \\
  -np 4 \\
  -cb \\
  -c 16384

# In the web UI, set the llama-server host to:
# http://192.168.1.100:8080`}</code></pre>

      <h2>Starting llama-server</h2>
      <p>Example startup command with recommended flags:</p>
      <pre><code>{`llama-server \\
  -m ~/models/llava-7b.gguf \\
  --mmproj ~/models/llava-mmproj.gguf \\
  --host 127.0.0.1 \\
  --port 8080 \\
  -np 4 \\
  -cb \\
  -c 16384 \\
  --mlock`}</code></pre>
      <table>
        <thead>
          <tr>
            <th>Flag</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>-m</code></td><td>Path to model file (GGUF format)</td></tr>
          <tr><td><code>--mmproj</code></td><td>Vision encoder (required for image analysis)</td></tr>
          <tr><td><code>--host</code></td><td>Bind address (use 0.0.0.0 for remote access)</td></tr>
          <tr><td><code>--port</code></td><td>Port number (default: 8080)</td></tr>
          <tr><td><code>-np</code></td><td>Parallel slots for concurrent requests</td></tr>
          <tr><td><code>-cb</code></td><td>Enable continuous batching</td></tr>
          <tr><td><code>-c</code></td><td>Total context size (divided among slots)</td></tr>
          <tr><td><code>--mlock</code></td><td>Lock model in RAM (prevents swapping)</td></tr>
        </tbody>
      </table>

      <h2>Proxy Configuration</h2>
      <p>If behind a corporate proxy:</p>
      <pre><code>{`# Set proxy for npm
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080`}</code></pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/admin/cli" className="text-blue-500 hover:underline">
            CLI Reference
          </Link>{' '}
          - Command-line usage
        </li>
        <li>
          <Link href="/docs/admin/api" className="text-blue-500 hover:underline">
            API Reference
          </Link>{' '}
          - REST API documentation
        </li>
      </ul>
    </div>
  );
}

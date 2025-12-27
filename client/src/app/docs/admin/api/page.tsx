import Link from 'next/link';

export default function APIReferencePage() {
  return (
    <div className="docs-content">
      <h1>API Reference</h1>
      <p className="lead">
        GenAI File Organizer provides a REST API for programmatic access to all features. The API runs on port 3001 by default.
      </p>

      <h2>Base URL</h2>
      <pre><code>http://localhost:3001</code></pre>

      <h2>Authentication</h2>
      <p>The API currently does not require authentication for local use. For production deployments, consider adding authentication middleware.</p>

      <h2>Health & Status</h2>

      <h3>GET /api/health</h3>
      <p>Check API server health.</p>
      <pre><code>{`curl http://localhost:3001/api/health`}</code></pre>
      <p><strong>Response:</strong></p>
      <pre><code>{`{
  "status": "ok",
  "timestamp": "2024-03-15T10:30:00.000Z"
}`}</code></pre>

      <h3>GET /api/health?detailed=true</h3>
      <p>Get detailed health status with all subsystems.</p>
      <pre><code>{`curl "http://localhost:3001/api/health?detailed=true"`}</code></pre>
      <p><strong>Response includes:</strong> database, ollama, rate limiter, memory, queue status</p>

      <h3>GET /api/ollama/status</h3>
      <p>Check Ollama connection status.</p>
      <pre><code>{`curl http://localhost:3001/api/ollama/status`}</code></pre>
      <p><strong>Response:</strong></p>
      <pre><code>{`{
  "connected": true,
  "model": "moondream",
  "host": "http://localhost:11434"
}`}</code></pre>

      <h2>File Operations</h2>

      <h3>GET /api/files</h3>
      <p>List files in a directory.</p>
      <pre><code>{`curl "http://localhost:3001/api/files?path=/Users/you/Downloads"`}</code></pre>
      <p><strong>Query Parameters:</strong></p>
      <ul>
        <li><code>path</code>: Directory path to list</li>
      </ul>
      <p><strong>Response:</strong></p>
      <pre><code>{`{
  "success": true,
  "files": [
    {
      "name": "image.png",
      "path": "/Users/you/Downloads/image.png",
      "isDirectory": false,
      "size": 102400,
      "modified": "2024-03-15T10:00:00.000Z",
      "isSupported": true
    }
  ]
}`}</code></pre>

      <h3>POST /api/process/file</h3>
      <p>Process a single file.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/process/file \\
  -H "Content-Type: application/json" \\
  -d '{"filePath": "/path/to/file.png", "dryRun": true}'`}</code></pre>
      <p><strong>Request Body:</strong></p>
      <pre><code>{`{
  "filePath": "/path/to/file.png",
  "dryRun": true,
  "autoMove": false
}`}</code></pre>
      <p><strong>Response:</strong></p>
      <pre><code>{`{
  "success": true,
  "result": {
    "originalPath": "/path/to/file.png",
    "originalName": "file.png",
    "suggestedName": "ss_app-screenshot_2024-03-15.png",
    "category": "screenshot",
    "dryRun": true
  }
}`}</code></pre>

      <h3>POST /api/process/directory</h3>
      <p>Process all files in a directory.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/process/directory \\
  -H "Content-Type: application/json" \\
  -d '{"dirPath": "/path/to/folder", "recursive": false}'`}</code></pre>

      <h3>POST /api/apply</h3>
      <p>Apply pending name changes.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/apply \\
  -H "Content-Type: application/json" \\
  -d '{"files": [{"filePath": "/path/to/file.png", "suggestedName": "new-name.png"}]}'`}</code></pre>

      <h2>Configuration</h2>

      <h3>GET /api/config</h3>
      <p>Get current configuration.</p>
      <pre><code>{`curl http://localhost:3001/api/config`}</code></pre>

      <h3>POST /api/config</h3>
      <p>Update configuration.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/config \\
  -H "Content-Type: application/json" \\
  -d '{"ollama": {"model": "llava:13b"}}'`}</code></pre>

      <h2>Prompts</h2>

      <h3>GET /api/prompts</h3>
      <p>List all prompt categories.</p>
      <pre><code>{`curl http://localhost:3001/api/prompts`}</code></pre>

      <h3>GET /api/prompts/:category</h3>
      <p>Get a specific prompt.</p>
      <pre><code>{`curl http://localhost:3001/api/prompts/screenshot`}</code></pre>

      <h3>PUT /api/prompts/:category</h3>
      <p>Update a prompt.</p>
      <pre><code>{`curl -X PUT http://localhost:3001/api/prompts/screenshot \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Generate a filename for this SCREENSHOT..."}'`}</code></pre>

      <h2>History</h2>

      <h3>GET /api/history</h3>
      <p>Get processing history.</p>
      <pre><code>{`curl "http://localhost:3001/api/history?limit=20"`}</code></pre>
      <p><strong>Query Parameters:</strong></p>
      <ul>
        <li><code>limit</code>: Max entries to return (default: 50)</li>
        <li><code>offset</code>: Pagination offset</li>
      </ul>

      <h3>POST /api/undo/:id</h3>
      <p>Undo a rename operation.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/undo/abc123`}</code></pre>

      <h2>Watch Mode</h2>

      <h3>POST /api/watch/start</h3>
      <p>Start watching a directory.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/watch/start \\
  -H "Content-Type: application/json" \\
  -d '{"paths": ["/path/to/watch"]}'`}</code></pre>

      <h3>POST /api/watch/stop</h3>
      <p>Stop watching.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/watch/stop`}</code></pre>

      <h3>GET /api/watch/status</h3>
      <p>Get watch status.</p>
      <pre><code>{`curl http://localhost:3001/api/watch/status`}</code></pre>

      <h2>Logs</h2>

      <h3>GET /api/logs/ai</h3>
      <p>Get AI processing logs.</p>
      <pre><code>{`curl "http://localhost:3001/api/logs/ai?page=1&limit=20&timeRange=7d"`}</code></pre>
      <p><strong>Query Parameters:</strong></p>
      <ul>
        <li><code>page</code>: Page number (default: 1)</li>
        <li><code>limit</code>: Items per page (default: 50)</li>
        <li><code>timeRange</code>: &apos;24h&apos;, &apos;7d&apos;, &apos;30d&apos;, or &apos;all&apos;</li>
      </ul>

      <h3>GET /api/logs/ai/:requestId</h3>
      <p>Get detailed AI log with prompts and responses.</p>
      <pre><code>{`curl http://localhost:3001/api/logs/ai/req_abc123`}</code></pre>

      <h3>GET /api/logs/api</h3>
      <p>Get API call logs.</p>

      <h3>GET /api/logs/errors</h3>
      <p>Get error logs.</p>

      <h3>GET /api/logs/effectiveness</h3>
      <p>Get prompt effectiveness metrics by category.</p>

      <h2>System Metrics</h2>

      <h3>GET /api/system/metrics</h3>
      <p>Get system performance metrics.</p>
      <pre><code>{`curl http://localhost:3001/api/system/metrics`}</code></pre>
      <p><strong>Response:</strong></p>
      <pre><code>{`{
  "success": true,
  "processing": {
    "total": 150,
    "succeeded": 142,
    "failed": 8,
    "successRate": 94.67
  },
  "api": {
    "totalRequests": 1250,
    "avgResponseTimeMs": 45
  },
  "memory": {
    "current": {
      "heapUsedMB": 128,
      "rssMB": 256
    },
    "status": "normal"
  }
}`}</code></pre>

      <h2>Rate Limiting</h2>

      <h3>GET /api/ai/rate-limit</h3>
      <p>Get current rate limit status.</p>
      <pre><code>{`curl http://localhost:3001/api/ai/rate-limit`}</code></pre>

      <h3>POST /api/ai/rate-limit</h3>
      <p>Configure rate limiting settings.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/ai/rate-limit \\
  -H "Content-Type: application/json" \\
  -d '{"maxTokens": 10, "refillRate": 2}'`}</code></pre>

      <h2>Memory Management</h2>

      <h3>GET /api/system/memory</h3>
      <p>Get memory status and trends.</p>
      <pre><code>{`curl http://localhost:3001/api/system/memory`}</code></pre>

      <h3>POST /api/system/memory/cleanup</h3>
      <p>Force garbage collection and cleanup.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/system/memory/cleanup`}</code></pre>

      <h2>Queue Management</h2>

      <h3>POST /api/queue/create</h3>
      <p>Create a batch processing queue.</p>

      <h3>GET /api/queue/status</h3>
      <p>Get current queue status.</p>
      <pre><code>{`curl http://localhost:3001/api/queue/status`}</code></pre>

      <h3>POST /api/queue/stop</h3>
      <p>Stop queue processing.</p>

      <h2>Config Export/Import</h2>

      <h3>GET /api/config/export</h3>
      <p>Export all settings as JSON.</p>
      <pre><code>{`curl http://localhost:3001/api/config/export > settings-backup.json`}</code></pre>

      <h3>POST /api/config/import</h3>
      <p>Import settings from JSON.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/config/import \\
  -H "Content-Type: application/json" \\
  -d @settings-backup.json`}</code></pre>

      <h2>Prompt Versioning</h2>

      <h3>GET /api/prompts/:category/history</h3>
      <p>Get version history for a prompt.</p>
      <pre><code>{`curl http://localhost:3001/api/prompts/screenshot/history`}</code></pre>

      <h3>POST /api/prompts/:category/rollback</h3>
      <p>Rollback to a previous version.</p>
      <pre><code>{`curl -X POST http://localhost:3001/api/prompts/screenshot/rollback \\
  -H "Content-Type: application/json" \\
  -d '{"version": 2}'`}</code></pre>

      <h3>GET /api/prompts/:category/diff</h3>
      <p>Compare two versions.</p>
      <pre><code>{`curl "http://localhost:3001/api/prompts/screenshot/diff?v1=1&v2=2"`}</code></pre>

      <h2>Error Responses</h2>
      <p>All errors follow this format:</p>
      <pre><code>{`{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}`}</code></pre>

      <h3>Common Error Codes</h3>
      <table>
        <thead>
          <tr>
            <th>HTTP Status</th>
            <th>Code</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>400</td><td>INVALID_REQUEST</td><td>Invalid request parameters</td></tr>
          <tr><td>404</td><td>NOT_FOUND</td><td>Resource not found</td></tr>
          <tr><td>500</td><td>INTERNAL_ERROR</td><td>Server error</td></tr>
          <tr><td>503</td><td>OLLAMA_UNAVAILABLE</td><td>Ollama not connected</td></tr>
        </tbody>
      </table>

      <h2>WebSocket Events</h2>
      <p>The API server supports WebSocket connections for real-time updates:</p>
      <pre><code>{`const socket = io('http://localhost:3001');

socket.on('processing:start', (data) => {
  console.log('Processing started:', data.filePath);
});

socket.on('processing:complete', (data) => {
  console.log('Processing complete:', data.suggestedName);
});

socket.on('processing:error', (data) => {
  console.error('Processing error:', data.error);
});`}</code></pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/admin/troubleshooting" className="text-blue-500 hover:underline">
            Troubleshooting
          </Link>{' '}
          - Common issues and solutions
        </li>
        <li>
          <Link href="/docs/logs" className="text-blue-500 hover:underline">
            Logs & Evaluation
          </Link>{' '}
          - Monitor API usage
        </li>
      </ul>
    </div>
  );
}

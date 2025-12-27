import Link from 'next/link';

export default function APILogsPage() {
  return (
    <div className="docs-content">
      <h1>API Logs</h1>
      <p className="lead">
        The API Logs tab shows all HTTP requests made to the GenAI File Organizer server. Use this for debugging communication issues and monitoring API performance.
      </p>

      <img
        src="/docs/api-logs-tab.png"
        alt="API Logs Tab"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Log Table</h2>
      <p>Each row displays:</p>
      <table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Time</strong></td>
            <td>Request timestamp</td>
          </tr>
          <tr>
            <td><strong>Method</strong></td>
            <td>HTTP method (GET, POST, PUT, DELETE)</td>
          </tr>
          <tr>
            <td><strong>Endpoint</strong></td>
            <td>API endpoint path</td>
          </tr>
          <tr>
            <td><strong>Status</strong></td>
            <td>HTTP status code</td>
          </tr>
          <tr>
            <td><strong>Duration</strong></td>
            <td>Response time in milliseconds</td>
          </tr>
          <tr>
            <td><strong>Result</strong></td>
            <td>Success/failure indicator</td>
          </tr>
        </tbody>
      </table>

      <h2>Status Codes</h2>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Meaning</th>
            <th>Color</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>200</strong></td>
            <td>OK - Request successful</td>
            <td>Green</td>
          </tr>
          <tr>
            <td><strong>201</strong></td>
            <td>Created - Resource created</td>
            <td>Green</td>
          </tr>
          <tr>
            <td><strong>304</strong></td>
            <td>Not Modified - Cached response</td>
            <td>Blue</td>
          </tr>
          <tr>
            <td><strong>400</strong></td>
            <td>Bad Request - Invalid parameters</td>
            <td>Yellow</td>
          </tr>
          <tr>
            <td><strong>404</strong></td>
            <td>Not Found - Resource not found</td>
            <td>Yellow</td>
          </tr>
          <tr>
            <td><strong>500</strong></td>
            <td>Server Error - Internal error</td>
            <td>Red</td>
          </tr>
          <tr>
            <td><strong>503</strong></td>
            <td>Service Unavailable - Ollama down</td>
            <td>Red</td>
          </tr>
        </tbody>
      </table>

      <h2>Filtered Endpoints</h2>
      <p>Some endpoints are excluded from logs to reduce noise:</p>
      <ul>
        <li><code>/api/health</code> - Health checks</li>
        <li><code>/api/ollama/status</code> - Status polling</li>
        <li><code>/api/logs/*</code> - Log queries themselves</li>
      </ul>

      <h2>Use Cases</h2>

      <h3>Debugging Frontend Issues</h3>
      <p>If the UI isn&apos;t working as expected:</p>
      <ol>
        <li>Perform the action in the UI</li>
        <li>Check API Logs for the corresponding request</li>
        <li>Look for error status codes (4xx, 5xx)</li>
        <li>Check response time for slowness</li>
      </ol>

      <h3>Monitoring Performance</h3>
      <p>Track response times to identify slow endpoints:</p>
      <ul>
        <li>Normal: &lt; 100ms for simple queries</li>
        <li>Slow: 100-500ms may need optimization</li>
        <li>Very slow: &gt; 500ms indicates issues</li>
      </ul>

      <h3>Tracking Errors</h3>
      <p>Filter by status codes to find problems:</p>
      <ul>
        <li>400 errors: Check request parameters</li>
        <li>500 errors: Check server logs for details</li>
        <li>503 errors: Check Ollama connection</li>
      </ul>

      <h2>Common API Patterns</h2>

      <h3>File Processing Flow</h3>
      <ol>
        <li><code>GET /api/files</code> - Load file list</li>
        <li><code>POST /api/process/file</code> - Process selected files</li>
        <li><code>POST /api/apply</code> - Apply name changes</li>
      </ol>

      <h3>Configuration Flow</h3>
      <ol>
        <li><code>GET /api/config</code> - Load current settings</li>
        <li><code>POST /api/config</code> - Save updated settings</li>
      </ol>

      <h3>Health Monitoring</h3>
      <ol>
        <li><code>GET /api/health</code> - Server status</li>
        <li><code>GET /api/ollama/status</code> - AI connection</li>
      </ol>

      <h2>API Access</h2>
      <pre><code>{`# Get API logs
curl "http://localhost:3001/api/logs/api?page=1&limit=50"

# Filter by status
curl "http://localhost:3001/api/logs/api?status=500"`}</code></pre>

      <h2>Correlating with AI Logs</h2>
      <p>API requests include a request ID that can be used to correlate with AI logs:</p>
      <ol>
        <li>Note the request ID from an API log entry</li>
        <li>Search for that ID in AI logs</li>
        <li>View the full AI processing details</li>
      </ol>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">
            AI Logs
          </Link>{' '}
          - Correlate API calls with AI processing
        </li>
        <li>
          <Link href="/docs/admin/api" className="text-blue-500 hover:underline">
            API Reference
          </Link>{' '}
          - Full API documentation
        </li>
      </ul>
    </div>
  );
}

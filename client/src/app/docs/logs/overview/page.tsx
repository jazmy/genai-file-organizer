import Link from 'next/link';

export default function LogsOverviewPage() {
  return (
    <div className="docs-content">
      <h1>Logs Overview</h1>
      <p className="lead">
        The Logs & Evaluation system provides complete transparency into how GenOrganize processes your files. Every AI interaction is logged for debugging and improvement.
      </p>

      <h2>Dashboard Layout</h2>
      <img
        src="/docs/logs-overview.png"
        alt="Logs Page Overview"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h3>Stats Cards</h3>
      <p>The top of the page displays four key metrics:</p>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total Requests</strong></td>
            <td>Number of files processed by AI in the selected time range</td>
          </tr>
          <tr>
            <td><strong>Success Rate</strong></td>
            <td>Percentage of processing requests completed without errors</td>
          </tr>
          <tr>
            <td><strong>Avg Response</strong></td>
            <td>Average time for AI to categorize and generate a name</td>
          </tr>
          <tr>
            <td><strong>Errors Today</strong></td>
            <td>Number of unresolved errors in the current day</td>
          </tr>
        </tbody>
      </table>

      <h3>Time Range Filter</h3>
      <p>Filter all data by time range using the buttons:</p>
      <ul>
        <li><strong>Last 24h</strong>: Past 24 hours</li>
        <li><strong>Last 7 days</strong>: Past week</li>
        <li><strong>Last 30 days</strong>: Past month</li>
        <li><strong>All time</strong>: Complete history</li>
      </ul>

      <h3>Search</h3>
      <p>Use the search box to filter logs by:</p>
      <ul>
        <li>Original filename</li>
        <li>Suggested filename</li>
        <li>Category name</li>
      </ul>

      <h2>Tab Navigation</h2>
      <p>The logs page has four tabs:</p>
      <table>
        <thead>
          <tr>
            <th>Tab</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>AI Logs</strong></td>
            <td>File processing history with prompts and responses</td>
          </tr>
          <tr>
            <td><strong>API Logs</strong></td>
            <td>HTTP request history for debugging</td>
          </tr>
          <tr>
            <td><strong>Errors</strong></td>
            <td>Error logs with resolution tracking</td>
          </tr>
          <tr>
            <td><strong>Effectiveness</strong></td>
            <td>Acceptance rates and performance metrics</td>
          </tr>
        </tbody>
      </table>

      <h2>What Gets Logged</h2>

      <h3>AI Processing</h3>
      <p>Every file processed by AI logs:</p>
      <ul>
        <li>Original filename and path</li>
        <li>Categorization prompt and response</li>
        <li>Naming prompt and response</li>
        <li>Detected category</li>
        <li>Suggested filename</li>
        <li>Processing duration</li>
        <li>User feedback (accepted/edited/rejected)</li>
      </ul>

      <h3>API Calls</h3>
      <p>Every HTTP request logs:</p>
      <ul>
        <li>Request method and endpoint</li>
        <li>Response status code</li>
        <li>Response time</li>
        <li>Error details (if any)</li>
      </ul>

      <h3>Errors</h3>
      <p>Errors are captured with:</p>
      <ul>
        <li>Error type and message</li>
        <li>Stack trace</li>
        <li>Related file path</li>
        <li>Request ID for correlation</li>
        <li>Resolution status and notes</li>
      </ul>

      <h2>Log Retention</h2>
      <p>By default, logs are retained for 30 days. Configure retention in the server configuration:</p>
      <pre><code>{`{
  "logging": {
    "retention": 30  // days
  }
}`}</code></pre>

      <h3>Manual Cleanup</h3>
      <pre><code>{`# Delete logs older than 7 days
curl -X DELETE "http://localhost:3001/api/logs/cleanup?days=7"`}</code></pre>

      <h2>Refresh Data</h2>
      <p>Click the <strong>Refresh</strong> button to reload the latest logs. Data does not auto-refresh to prevent performance issues.</p>

      <h2>Exporting Logs</h2>
      <p>Export logs via the API:</p>
      <pre><code>{`# Export AI logs as JSON
curl "http://localhost:3001/api/logs/ai?limit=1000" > ai-logs.json

# Export errors
curl "http://localhost:3001/api/logs/errors" > errors.json`}</code></pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">
            AI Logs
          </Link>{' '}
          - Deep dive into AI processing logs
        </li>
        <li>
          <Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">
            Effectiveness
          </Link>{' '}
          - Track and improve accuracy
        </li>
      </ul>
    </div>
  );
}

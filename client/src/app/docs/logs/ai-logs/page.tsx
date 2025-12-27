import Link from 'next/link';

export default function AILogsPage() {
  return (
    <div className="docs-content">
      <h1>AI Logs</h1>
      <p className="lead">
        The AI Logs tab shows every file processed by GenOrganize. View the exact prompts sent to the AI and its responses for debugging and improvement.
      </p>

      <img
        src="/docs/ai-logs-tab.png"
        alt="AI Logs Tab"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Log Table</h2>
      <p>Each row in the AI Logs table displays:</p>
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
            <td>When the file was processed</td>
          </tr>
          <tr>
            <td><strong>File</strong></td>
            <td>Original filename</td>
          </tr>
          <tr>
            <td><strong>Category</strong></td>
            <td>Detected file category (e.g., screenshot, invoice)</td>
          </tr>
          <tr>
            <td><strong>Suggested Name</strong></td>
            <td>AI-generated filename suggestion</td>
          </tr>
          <tr>
            <td><strong>Status</strong></td>
            <td>Success, pending, or error</td>
          </tr>
          <tr>
            <td><strong>Duration</strong></td>
            <td>Total processing time</td>
          </tr>
          <tr>
            <td><strong>Feedback</strong></td>
            <td>User action: Accepted, Edited, Rejected, or Skipped</td>
          </tr>
          <tr>
            <td><strong>Actions</strong></td>
            <td>View details button</td>
          </tr>
        </tbody>
      </table>

      <h2>Status Indicators</h2>
      <ul>
        <li><strong>Success</strong> (green): Processing completed successfully</li>
        <li><strong>Pending</strong> (yellow): Processing in progress or waiting</li>
        <li><strong>Error</strong> (red): Processing failed</li>
      </ul>

      <h2>Feedback Indicators</h2>
      <p>Tracks how users respond to AI suggestions:</p>
      <ul>
        <li><strong>Accepted</strong>: User applied the suggestion as-is</li>
        <li><strong>Edited</strong>: User modified the suggestion before applying</li>
        <li><strong>Rejected</strong>: User dismissed the suggestion</li>
        <li><strong>Skipped</strong>: User kept the original filename</li>
        <li><strong>-</strong>: No feedback yet (pending)</li>
      </ul>

      <h2>Log Detail Modal</h2>
      <p>Click <strong>&quot;View details&quot;</strong> on any log to open the detail modal.</p>
      <img
        src="/docs/log-detail-modal.png"
        alt="Log Detail Modal"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h3>Overview Tab</h3>
      <p>Shows summary information:</p>
      <ul>
        <li><strong>File Information</strong>: Original path, file type, size</li>
        <li><strong>Processing Result</strong>: Original → Suggested name, category, final name</li>
        <li><strong>Timing</strong>: Total time, categorization time, naming time</li>
        <li><strong>Model</strong>: AI model used for processing</li>
        <li><strong>Timestamps</strong>: Created, completed, feedback timestamps</li>
      </ul>

      <h3>Categorization Tab</h3>
      <img
        src="/docs/log-detail-prompt.png"
        alt="Categorization Prompt"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />
      <p>Shows the categorization step:</p>
      <ul>
        <li><strong>Prompt</strong>: The exact prompt sent to the AI</li>
        <li><strong>Response</strong>: The AI&apos;s raw response</li>
        <li><strong>Detected Category</strong>: The parsed category</li>
        <li><strong>Time</strong>: Duration of this step</li>
      </ul>
      <p>Use the <strong>&quot;Copy prompt&quot;</strong> button to copy for testing.</p>

      <h3>Naming Tab</h3>
      <p>Shows the filename generation step:</p>
      <ul>
        <li><strong>Prompt</strong>: The category-specific naming prompt</li>
        <li><strong>Response</strong>: The AI&apos;s suggested filename</li>
        <li><strong>Time</strong>: Duration of naming step</li>
      </ul>

      <h2>Filtering Logs</h2>

      <h3>By Time Range</h3>
      <p>Use the time range buttons to filter:</p>
      <ul>
        <li>Last 24h</li>
        <li>Last 7 days</li>
        <li>Last 30 days</li>
        <li>All time</li>
      </ul>

      <h3>By Search</h3>
      <p>Type in the search box to filter by:</p>
      <ul>
        <li>Original filename</li>
        <li>Suggested filename</li>
        <li>Category name</li>
      </ul>

      <h2>Using Logs for Debugging</h2>

      <h3>Understanding Poor Categorization</h3>
      <ol>
        <li>Find the log entry with incorrect category</li>
        <li>Click <strong>View details</strong></li>
        <li>Go to the <strong>Categorization</strong> tab</li>
        <li>Review the prompt and response</li>
        <li>Check if the category description needs improvement</li>
      </ol>

      <h3>Understanding Poor Naming</h3>
      <ol>
        <li>Find the log entry with poor name suggestion</li>
        <li>Click <strong>View details</strong></li>
        <li>Go to the <strong>Naming</strong> tab</li>
        <li>Review what information the AI extracted</li>
        <li>Adjust the naming prompt for that category</li>
      </ol>

      <h3>Testing Prompts</h3>
      <ol>
        <li>Copy a prompt from the log detail modal</li>
        <li>Test directly with Ollama:
          <pre><code>{`ollama run qwen3-vl:8b "YOUR PROMPT HERE"`}</code></pre>
        </li>
        <li>Iterate on the prompt</li>
        <li>Update in File Types settings</li>
      </ol>

      <h2>API Access</h2>
      <pre><code>{`# Get AI logs
curl "http://localhost:3001/api/logs/ai?page=1&limit=20&timeRange=7d"

# Get single log with details
curl "http://localhost:3001/api/logs/ai/req_abc123"`}</code></pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">
            Effectiveness
          </Link>{' '}
          - Track acceptance rates by category
        </li>
        <li>
          <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">
            File Types
          </Link>{' '}
          - Improve prompts based on log insights
        </li>
      </ul>
    </div>
  );
}

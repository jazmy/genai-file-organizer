import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="docs-content">
      <h1>Settings</h1>
      <p className="lead">
        Configure GenAI File Organizer to match your workflow. Access file type management, logs, and backup/restore your settings.
      </p>

      <h2>Accessing Settings</h2>
      <p>Click <strong>&quot;Settings&quot;</strong> in the sidebar to open the settings panel.</p>

      <img
        src="/docs/settings.png"
        alt="Settings Page"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Configuration</h2>
      <p>The settings page provides quick access to key configuration areas:</p>

      <h3>File Types &amp; Prompts</h3>
      <p>Manage how files are categorized and named:</p>
      <ul>
        <li>Create and edit file type categories</li>
        <li>Customize AI prompts for each category</li>
        <li>Set folder destinations for auto-organization</li>
        <li>Enable/disable auto-organize and folder creation</li>
      </ul>
      <p>
        See the{' '}
        <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">
          File Types documentation
        </Link>{' '}
        for detailed information.
      </p>

      <h3>Logs &amp; Analytics</h3>
      <p>Monitor AI processing and system performance:</p>
      <ul>
        <li>View AI processing logs with prompts and responses</li>
        <li>Track API calls and response times</li>
        <li>Review errors and their resolution status</li>
        <li>Analyze effectiveness metrics by category</li>
      </ul>
      <p>
        See the{' '}
        <Link href="/docs/logs" className="text-blue-500 hover:underline">
          Logs &amp; Evaluation documentation
        </Link>{' '}
        for detailed information.
      </p>

      <h2>Backup &amp; Restore</h2>
      <p>Export and import your settings for backup or transfer to another instance.</p>

      <h3>Export Settings</h3>
      <p>Download your configuration as a JSON file:</p>
      <ul>
        <li>Click <strong>Export to File</strong></li>
        <li>A JSON file will be downloaded to your computer</li>
        <li>Store this file safely for backup purposes</li>
      </ul>

      <h3>Import Settings</h3>
      <p>Restore configuration from a previously exported file:</p>
      <ul>
        <li>Click <strong>Import from File</strong></li>
        <li>Select a previously exported JSON file</li>
        <li>Your settings will be updated with the imported configuration</li>
      </ul>

      <h3>What Gets Exported</h3>
      <ul>
        <li>Application configuration</li>
        <li>Custom file types and their prompts</li>
        <li>All prompt customizations</li>
      </ul>
      <p><strong>Note:</strong> Importing will update existing settings. Custom file types will be merged with existing ones.</p>

      <h2>Sidebar Settings</h2>
      <p>Some settings are accessible directly from the sidebar:</p>

      <h3>Folder Shortcuts</h3>
      <p>Quick-access buttons for frequently used folders appear in the sidebar under &quot;Shortcuts&quot;.</p>

      <h3>Theme Toggle</h3>
      <p>Switch between light and dark mode using the sun/moon icon at the bottom of the sidebar:</p>
      <ul>
        <li><strong>Dark</strong> (default): Easy on the eyes, recommended for most users</li>
        <li><strong>Light</strong>: Bright background with dark text</li>
      </ul>

      <h2>Ollama Configuration</h2>
      <p>Ollama settings are configured via environment variables in the server:</p>

      <h3>Server Configuration</h3>
      <p>Environment variables in <code>server/.env</code>:</p>
      <pre><code>{`OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3-vl:8b
PORT=3001
LOG_LEVEL=info`}</code></pre>

      <h3>Recommended Models</h3>
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
      <p><strong>Tip:</strong> Use <code>moondream</code> for 4x faster processing with good accuracy.</p>

      <h3>Client Configuration</h3>
      <p>Environment in <code>client/.env.local</code>:</p>
      <pre><code>{`NEXT_PUBLIC_API_URL=http://localhost:3001`}</code></pre>

      <h2>Troubleshooting</h2>
      <h3>Ollama Not Connecting</h3>
      <ul>
        <li>Verify Ollama is running: <code>ollama serve</code></li>
        <li>Check the host URL in your <code>.env</code> file</li>
        <li>Ensure the model is installed: <code>ollama list</code></li>
      </ul>

      <h3>Import/Export Issues</h3>
      <ul>
        <li>Ensure the JSON file is valid and not corrupted</li>
        <li>Check browser console for error messages</li>
        <li>Verify the API server is running</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">
            File Types
          </Link>{' '}
          - Customize file categories and prompts
        </li>
        <li>
          <Link href="/docs/admin/configuration" className="text-blue-500 hover:underline">
            Advanced Configuration
          </Link>{' '}
          - Server-side settings and environment variables
        </li>
      </ul>
    </div>
  );
}

import Link from 'next/link';

export default function CLIReferencePage() {
  return (
    <div className="docs-content">
      <h1>CLI Reference</h1>
      <p className="lead">
        GenAI File Organizer includes a powerful command-line interface for batch processing, automation, and scripting.
      </p>

      <h2>Getting Started</h2>
      <pre><code>{`# Run CLI commands from the root directory
npm run cli -- <command> [options]

# Or from the server directory
cd server
npm run cli -- <command> [options]`}</code></pre>

      <h2>Commands</h2>

      <h3>process</h3>
      <p>Process files or directories for AI-powered renaming.</p>
      <pre><code>{`npm run cli -- process <path> [options]`}</code></pre>

      <h4>Options</h4>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Alias</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>--recursive</code></td>
            <td><code>-r</code></td>
            <td>Process directories recursively</td>
          </tr>
          <tr>
            <td><code>--dry-run</code></td>
            <td><code>-d</code></td>
            <td>Preview changes without applying</td>
          </tr>
          <tr>
            <td><code>--move</code></td>
            <td><code>-m</code></td>
            <td>Move files to organized folders</td>
          </tr>
          <tr>
            <td><code>--skip-audio</code></td>
            <td></td>
            <td>Skip audio files</td>
          </tr>
          <tr>
            <td><code>--skip-video</code></td>
            <td></td>
            <td>Skip video files</td>
          </tr>
          <tr>
            <td><code>--filter</code></td>
            <td><code>-f</code></td>
            <td>Filter by file extension (e.g., &quot;.png,.jpg&quot;)</td>
          </tr>
        </tbody>
      </table>

      <h4>Examples</h4>
      <pre><code>{`# Preview processing a single file
npm run cli -- process ./image.png --dry-run

# Process all files in a directory
npm run cli -- process ./Downloads

# Process recursively with auto-organization
npm run cli -- process ./Documents --recursive --move

# Process only images
npm run cli -- process ./Photos --filter ".png,.jpg,.jpeg"

# Skip media files for faster processing
npm run cli -- process ./Mixed --skip-audio --skip-video`}</code></pre>

      <h3>watch</h3>
      <p>Watch directories for new files and process them automatically.</p>
      <pre><code>{`npm run cli -- watch [directories...] [options]`}</code></pre>

      <h4>Options</h4>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>--move-to</code></td>
            <td>Move processed files to this directory</td>
          </tr>
          <tr>
            <td><code>--delay</code></td>
            <td>Delay before processing (ms, default: 1000)</td>
          </tr>
          <tr>
            <td><code>--dry-run</code></td>
            <td>Preview without renaming</td>
          </tr>
        </tbody>
      </table>

      <h4>Examples</h4>
      <pre><code>{`# Watch a single directory
npm run cli -- watch ./Inbox

# Watch multiple directories
npm run cli -- watch ./Downloads ./Desktop

# Watch and move to organized folder
npm run cli -- watch ./Inbox --move-to ./Organized

# Watch with custom delay
npm run cli -- watch ./Inbox --delay 2000`}</code></pre>

      <h3>history</h3>
      <p>View processing history and past renames.</p>
      <pre><code>{`npm run cli -- history [options]`}</code></pre>

      <h4>Options</h4>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>--limit</code></td>
            <td>Number of entries to show (default: 20)</td>
          </tr>
          <tr>
            <td><code>--json</code></td>
            <td>Output as JSON</td>
          </tr>
        </tbody>
      </table>

      <h4>Examples</h4>
      <pre><code>{`# View recent history
npm run cli -- history

# View last 50 entries
npm run cli -- history --limit 50

# Export as JSON
npm run cli -- history --json > history.json`}</code></pre>

      <h3>undo</h3>
      <p>Undo a previous rename operation.</p>
      <pre><code>{`npm run cli -- undo <historyId>`}</code></pre>

      <h4>Examples</h4>
      <pre><code>{`# View history to get IDs
npm run cli -- history

# Undo a specific rename
npm run cli -- undo abc123`}</code></pre>

      <h3>config</h3>
      <p>Manage application configuration.</p>
      <pre><code>{`npm run cli -- config [options]`}</code></pre>

      <h4>Options</h4>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>--init</code></td>
            <td>Create default configuration file</td>
          </tr>
          <tr>
            <td><code>--show</code></td>
            <td>Display current configuration</td>
          </tr>
          <tr>
            <td><code>--set</code></td>
            <td>Set a configuration value</td>
          </tr>
        </tbody>
      </table>

      <h4>Examples</h4>
      <pre><code>{`# Create default config
npm run cli -- config --init

# Show current config
npm run cli -- config --show

# Set a value
npm run cli -- config --set ollama.model=llava:13b`}</code></pre>

      <h3>doctor</h3>
      <p>Run system diagnostics and check dependencies.</p>
      <pre><code>{`npm run cli -- doctor`}</code></pre>

      <p>Checks:</p>
      <ul>
        <li>Node.js version</li>
        <li>Ollama connection</li>
        <li>Model availability</li>
        <li>ffmpeg installation</li>
        <li>whisper.cpp installation</li>
        <li>Database connectivity</li>
      </ul>

      <h2>Exit Codes</h2>
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>0</td><td>Success</td></tr>
          <tr><td>1</td><td>General error</td></tr>
          <tr><td>2</td><td>Invalid arguments</td></tr>
          <tr><td>3</td><td>File not found</td></tr>
          <tr><td>4</td><td>Ollama connection error</td></tr>
        </tbody>
      </table>

      <h2>Automation Examples</h2>

      <h3>Cron Job</h3>
      <p>Process Downloads folder every hour:</p>
      <pre><code>{`# Add to crontab (crontab -e)
0 * * * * cd /path/to/genorganize && npm run cli -- process ~/Downloads --recursive`}</code></pre>

      <h3>Shell Script</h3>
      <pre><code>{`#!/bin/bash
# organize-downloads.sh

cd /path/to/genorganize

# Process and organize
npm run cli -- process ~/Downloads \\
  --recursive \\
  --move \\
  --skip-video

# Log completion
echo "$(date): Downloads organized" >> /var/log/genorganize.log`}</code></pre>

      <h3>Watch as Service (systemd)</h3>
      <pre><code>{`# /etc/systemd/system/genorganize-watch.service
[Unit]
Description=GenAI File Organizer Watch Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/genorganize
ExecStart=/usr/bin/npm run cli -- watch /home/youruser/Inbox
Restart=on-failure

[Install]
WantedBy=multi-user.target`}</code></pre>

      <h2>Piping and Output</h2>
      <pre><code>{`# Process and capture output
npm run cli -- process ./folder --dry-run > preview.txt

# Process with JSON output
npm run cli -- history --json | jq '.[] | select(.status == "success")'

# Count processed files
npm run cli -- history --json | jq length`}</code></pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/admin/api" className="text-blue-500 hover:underline">
            API Reference
          </Link>{' '}
          - REST API documentation
        </li>
        <li>
          <Link href="/docs/admin/troubleshooting" className="text-blue-500 hover:underline">
            Troubleshooting
          </Link>{' '}
          - Common issues and solutions
        </li>
      </ul>
    </div>
  );
}

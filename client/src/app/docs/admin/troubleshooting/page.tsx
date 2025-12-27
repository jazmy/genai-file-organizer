import Link from 'next/link';

export default function TroubleshootingPage() {
  return (
    <div className="docs-content">
      <h1>Troubleshooting</h1>
      <p className="lead">
        Solutions for common issues you may encounter when using GenOrganize.
      </p>

      <h2>Quick Diagnostics</h2>
      <p>Run the doctor command to check your setup:</p>
      <pre><code>npm run doctor</code></pre>
      <p>This checks Node.js, Ollama, models, and optional dependencies.</p>

      <h2>Connection Issues</h2>

      <h3>Ollama Not Connecting</h3>
      <p><strong>Symptoms:</strong> Status bar shows &quot;Disconnected&quot;, API returns 503</p>
      <p><strong>Solutions:</strong></p>
      <ol>
        <li>
          <strong>Check if Ollama is running:</strong>
          <pre><code>{`# Check process
ps aux | grep ollama

# Check API
curl http://localhost:11434/api/tags`}</code></pre>
        </li>
        <li>
          <strong>Start Ollama:</strong>
          <pre><code>ollama serve</code></pre>
        </li>
        <li>
          <strong>Check the model is installed:</strong>
          <pre><code>{`ollama list
# If missing, pull it
ollama pull qwen3-vl:8b`}</code></pre>
        </li>
        <li>
          <strong>Verify settings:</strong> Check Settings → Ollama Host matches where Ollama is running
        </li>
      </ol>

      <h3>API Server Not Responding</h3>
      <p><strong>Symptoms:</strong> Web UI shows loading forever, can&apos;t connect to localhost:3001</p>
      <p><strong>Solutions:</strong></p>
      <ol>
        <li>
          <strong>Check if server is running:</strong>
          <pre><code>{`curl http://localhost:3001/api/health

# If not responding, check process
lsof -i :3001`}</code></pre>
        </li>
        <li>
          <strong>Start the server:</strong>
          <pre><code>npm run server</code></pre>
        </li>
        <li>
          <strong>Check for errors:</strong> Look at the terminal where the server is running for error messages
        </li>
      </ol>

      <h3>Port Already in Use</h3>
      <p><strong>Symptoms:</strong> &quot;EADDRINUSE&quot; error when starting server</p>
      <p><strong>Solutions:</strong></p>
      <pre><code>{`# Find what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3002 npm run server`}</code></pre>

      <h2>Processing Issues</h2>

      <h3>AI Not Generating Names</h3>
      <p><strong>Symptoms:</strong> Files stay in &quot;Processing&quot; state, no suggestions appear</p>
      <p><strong>Solutions:</strong></p>
      <ol>
        <li>
          <strong>Check Ollama status:</strong> Verify the status bar shows &quot;Ollama Connected&quot;
        </li>
        <li>
          <strong>Check the model:</strong>
          <pre><code>{`ollama list
# Ensure your configured model is listed`}</code></pre>
        </li>
        <li>
          <strong>Check server logs:</strong> Look for errors in the terminal running the server
        </li>
        <li>
          <strong>Try a single file:</strong> Test with one small image file first
        </li>
      </ol>

      <h3>Slow Processing</h3>
      <p><strong>Symptoms:</strong> Files take minutes to process</p>
      <p><strong>Solutions:</strong></p>
      <ul>
        <li><strong>Use moondream model:</strong> Switch to <code>moondream</code> for 4x faster processing:
          <pre><code>{`ollama pull moondream`}</code></pre>
        </li>
        <li><strong>Reduce batch size:</strong> Lower the parallel processing count in Settings</li>
        <li><strong>Skip media files:</strong> Enable <code>SKIP_VIDEO</code> and <code>SKIP_AUDIO</code> for faster processing</li>
        <li><strong>Close other applications:</strong> Free up CPU/GPU resources</li>
        <li><strong>Check system resources:</strong> Run <code>top</code> or Activity Monitor</li>
      </ul>

      <h3>Poor Quality Suggestions</h3>
      <p><strong>Symptoms:</strong> Generated names are inaccurate or generic</p>
      <p><strong>Solutions:</strong></p>
      <ol>
        <li>
          <strong>Use a better model:</strong> Try <code>llava:13b</code> for improved accuracy
        </li>
        <li>
          <strong>Customize prompts:</strong> Edit the prompts in File Types to be more specific
        </li>
        <li>
          <strong>Check file quality:</strong> Blurry images or corrupt files may not analyze well
        </li>
        <li>
          <strong>Review AI logs:</strong> Check{' '}
          <Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">
            AI Logs
          </Link>{' '}
          to see what the AI detected
        </li>
      </ol>

      <h2>Memory Issues</h2>

      <h3>Out of Memory</h3>
      <p><strong>Symptoms:</strong> App crashes, &quot;heap out of memory&quot; errors</p>
      <p><strong>Solutions:</strong></p>
      <ul>
        <li><strong>Reduce batch size:</strong> Process fewer files at once</li>
        <li><strong>Use a smaller model:</strong> Large models require more RAM</li>
        <li><strong>Skip video files:</strong> Video processing uses more memory</li>
        <li>
          <strong>Increase Node memory:</strong>
          <pre><code>NODE_OPTIONS=--max-old-space-size=4096 npm run server</code></pre>
        </li>
      </ul>

      <h3>Disk Space Full</h3>
      <p><strong>Symptoms:</strong> Database errors, can&apos;t save files</p>
      <p><strong>Solutions:</strong></p>
      <pre><code>{`# Check disk space
df -h

# Clear old logs
npm run cli -- logs:cleanup --days 7

# Remove temp files
rm -rf server/temp/*`}</code></pre>

      <h2>Database Issues</h2>

      <h3>Database Locked</h3>
      <p><strong>Symptoms:</strong> &quot;SQLITE_BUSY&quot; errors</p>
      <p><strong>Solutions:</strong></p>
      <ol>
        <li>Stop all GenOrganize processes</li>
        <li>Check for stale lock files:
          <pre><code>{`ls -la server/data/*.db-*
rm server/data/*.db-wal server/data/*.db-shm`}</code></pre>
        </li>
        <li>Restart the server</li>
      </ol>

      <h3>Reset Database</h3>
      <p><strong>Warning:</strong> This deletes all history and settings</p>
      <pre><code>{`# Backup first
cp server/data/genorganize.db server/data/genorganize.db.backup

# Delete database
rm server/data/genorganize.db

# Restart server (will recreate database)
npm run server`}</code></pre>

      <h2>Installation Issues</h2>

      <h3>npm Install Fails</h3>
      <p><strong>Solutions:</strong></p>
      <pre><code>{`# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try with legacy peer deps
npm install --legacy-peer-deps`}</code></pre>

      <h3>Permission Errors</h3>
      <p><strong>Solutions:</strong></p>
      <pre><code>{`# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules

# Or use nvm (recommended)
nvm install 18
nvm use 18`}</code></pre>

      <h2>Categorization Issues</h2>

      <h3>Transcripts Categorized as Meeting Notes</h3>
      <p><strong>Symptoms:</strong> Files with timestamps and speaker labels getting <code>meeting_</code> prefix instead of <code>transcript_</code></p>
      <p><strong>Solutions:</strong></p>
      <ul>
        <li><strong>Check transcript indicators:</strong> Transcripts should have timestamps like &quot;00:00&quot; and speaker labels like &quot;John:&quot;</li>
        <li><strong>Update category descriptions:</strong> In File Types, make the transcript description more specific</li>
        <li><strong>Review the categorization prompt:</strong> Ensure it prioritizes transcript detection</li>
      </ul>

      <h3>Wrong File Extensions</h3>
      <p><strong>Symptoms:</strong> Files renamed with wrong extensions</p>
      <p><strong>Solutions:</strong></p>
      <ul>
        <li>GenOrganize always preserves the original file&apos;s extension</li>
        <li>If you see wrong extensions, check the <code>responseValidator.js</code> file</li>
        <li>The AI output extension is always ignored; only original extension is used</li>
      </ul>

      <h2>Rate Limiting Issues</h2>
      <p><strong>Symptoms:</strong> Requests being throttled or queued</p>
      <p><strong>Solutions:</strong></p>
      <ul>
        <li><strong>Check rate limit status:</strong>
          <pre><code>{`curl http://localhost:3001/api/ai/rate-limit`}</code></pre>
        </li>
        <li><strong>Increase limits:</strong> In Settings, increase Max Tokens or Refill Rate</li>
        <li><strong>Disable rate limiting:</strong> Set <code>RATE_LIMIT_ENABLED=false</code> in .env (not recommended for production)</li>
      </ul>

      <h2>Debug Mode</h2>
      <p>Enable verbose logging for more information:</p>
      <pre><code>{`# Start server with debug logging
LOG_LEVEL=debug npm run server

# Check browser console for frontend errors
# Open DevTools → Console tab`}</code></pre>

      <h2>Getting More Help</h2>
      <ol>
        <li>Check the{' '}
          <Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">
            AI Logs
          </Link>{' '}
          for detailed error information
        </li>
        <li>Review the server terminal output for errors</li>
        <li>Check browser DevTools console for frontend errors</li>
        <li>Run <code>npm run doctor</code> to verify your setup</li>
      </ol>

      <h2>Common Error Messages</h2>
      <table>
        <thead>
          <tr>
            <th>Error</th>
            <th>Cause</th>
            <th>Solution</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ECONNREFUSED</code></td>
            <td>Server not running</td>
            <td>Start the API server</td>
          </tr>
          <tr>
            <td><code>OLLAMA_UNAVAILABLE</code></td>
            <td>Ollama not running</td>
            <td>Start Ollama with <code>ollama serve</code></td>
          </tr>
          <tr>
            <td><code>MODEL_NOT_FOUND</code></td>
            <td>Model not installed</td>
            <td>Pull model: <code>ollama pull qwen3-vl:8b</code></td>
          </tr>
          <tr>
            <td><code>ENOENT</code></td>
            <td>File not found</td>
            <td>Check file path exists</td>
          </tr>
          <tr>
            <td><code>TIMEOUT</code></td>
            <td>Processing too slow</td>
            <td>Use a faster model or skip large files</td>
          </tr>
        </tbody>
      </table>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/logs/overview" className="text-blue-500 hover:underline">
            Logs & Evaluation
          </Link>{' '}
          - Monitor for errors
        </li>
        <li>
          <Link href="/docs/admin/configuration" className="text-blue-500 hover:underline">
            Configuration
          </Link>{' '}
          - Adjust settings
        </li>
      </ul>
    </div>
  );
}

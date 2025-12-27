import Link from 'next/link';

export default function GettingStartedPage() {
  return (
    <div className="docs-content">
      <h1>Getting Started</h1>
      <p className="lead">
        Get up and running with GenOrganize in minutes. This guide will walk you through launching the application and processing your first files.
      </p>

      <h2>Prerequisites</h2>
      <p>Before starting, ensure you have:</p>
      <ul>
        <li><strong>Node.js 18+</strong> installed</li>
        <li><strong>Ollama</strong> installed and running</li>
        <li>A vision-language model pulled (e.g., <code>moondream</code> for fast processing or <code>qwen3-vl:8b</code> for better quality)</li>
      </ul>
      <p>
        Need help with installation? See the{' '}
        <Link href="/docs/admin/installation" className="text-blue-500 hover:underline">
          Installation Guide
        </Link>
        .
      </p>

      <h2>Launching the Application</h2>
      <h3>Step 1: Start the API Server</h3>
      <p>Open a terminal in the project directory and run:</p>
      <pre><code>npm run server</code></pre>
      <p>You should see output confirming the server is running on port 3001.</p>

      <h3>Step 2: Start the Web UI</h3>
      <p>In a new terminal window, run:</p>
      <pre><code>npm run web</code></pre>
      <p>The web interface will start on port 3000.</p>

      <h3>Step 3: Open the Application</h3>
      <p>
        Open your browser and navigate to{' '}
        <code>http://localhost:3000</code>
      </p>

      <h2>First-Time Setup</h2>
      <h3>Check Connection Status</h3>
      <p>
        Look at the bottom status bar. You should see <strong>&quot;Ollama Connected&quot;</strong> in green. If you see &quot;Disconnected,&quot; verify that:
      </p>
      <ul>
        <li>Ollama is running (<code>ollama serve</code>)</li>
        <li>The model is installed (<code>ollama list</code>)</li>
        <li>The server is running (<code>npm run server</code>)</li>
      </ul>

      <h3>Set Your Home Directory</h3>
      <ol>
        <li>Click <strong>Settings</strong> in the sidebar</li>
        <li>Under <strong>General</strong>, set your <strong>Default Home Directory</strong></li>
        <li>This folder will open automatically when you start the app</li>
      </ol>

      <h3>Add Folder Shortcuts</h3>
      <p>Add shortcuts to your frequently used folders:</p>
      <ol>
        <li>In Settings, scroll to <strong>Folder Shortcuts</strong></li>
        <li>Enter a name (e.g., &quot;Downloads&quot;)</li>
        <li>Enter the full path (e.g., <code>/Users/you/Downloads</code>)</li>
        <li>Click <strong>Add Shortcut</strong></li>
      </ol>

      <h2>Processing Your First Files</h2>
      <h3>Step 1: Navigate to a Folder</h3>
      <p>
        Use the folder tree in the sidebar or click a shortcut to navigate to a folder containing files you want to organize.
      </p>

      <h3>Step 2: Select Files</h3>
      <p>
        Click on files to select them. You can also:
      </p>
      <ul>
        <li>Click checkboxes on individual file cards</li>
        <li>Click <strong>Select All</strong> in a section header</li>
        <li>Use the master checkbox in the toolbar</li>
      </ul>

      <h3>Step 3: Generate Names</h3>
      <p>
        With files selected, click the <strong>Generate Name</strong> button in the header. The AI will:
      </p>
      <ol>
        <li>Analyze each file&apos;s content (images are visually analyzed)</li>
        <li>Detect the file category (screenshot, invoice, document, etc.)</li>
        <li>Generate a descriptive filename</li>
      </ol>
      <p>Files move to the <strong>Processing</strong> section while being analyzed, then to <strong>Pending Approval</strong> when complete.</p>

      <h3>Step 4: Review Suggestions</h3>
      <p>
        In the <strong>Pending Approval</strong> section, you&apos;ll see:
      </p>
      <ul>
        <li>The original filename</li>
        <li>The AI-suggested filename</li>
        <li>A preview thumbnail (for images)</li>
      </ul>
      <p>
        Click on a suggested name to edit it before applying.
      </p>

      <h3>Step 5: Apply Changes</h3>
      <p>When you&apos;re satisfied with the suggestions:</p>
      <ul>
        <li>Click the <strong>checkmark</strong> button on individual files, or</li>
        <li>Click <strong>Approve Name</strong> in the header to rename all ready files</li>
      </ul>

      <h2>What&apos;s Next?</h2>
      <p>Now that you&apos;ve processed your first files, explore these features:</p>
      <ul>
        <li>
          <Link href="/docs/user/interface" className="text-blue-500 hover:underline">
            Interface Overview
          </Link>{' '}
          - Learn all the interface components
        </li>
        <li>
          <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">
            File Types
          </Link>{' '}
          - Customize how files are categorized and named
        </li>
        <li>
          <Link href="/docs/user/ai-processing" className="text-blue-500 hover:underline">
            AI Processing
          </Link>{' '}
          - Deep dive into the AI naming system
        </li>
      </ul>
    </div>
  );
}

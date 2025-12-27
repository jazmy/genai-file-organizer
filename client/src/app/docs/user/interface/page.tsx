import Link from 'next/link';

export default function InterfacePage() {
  return (
    <div className="docs-content">
      <h1>Interface Overview</h1>
      <p className="lead">
        GenAI File Organizer has a clean, intuitive interface designed for efficient file management. Learn about each component and how they work together.
      </p>

      <img
        src="/docs/main-interface.png"
        alt="Main Interface"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Layout Overview</h2>
      <p>The interface is divided into four main areas:</p>
      <table>
        <thead>
          <tr>
            <th>Area</th>
            <th>Location</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Sidebar</strong></td>
            <td>Left side</td>
            <td>Navigation, shortcuts, folder tree, settings access</td>
          </tr>
          <tr>
            <td><strong>Header</strong></td>
            <td>Top</td>
            <td>Breadcrumbs, view controls, bulk actions</td>
          </tr>
          <tr>
            <td><strong>File Browser</strong></td>
            <td>Center</td>
            <td>Browse, select, and manage files</td>
          </tr>
          <tr>
            <td><strong>Status Bar</strong></td>
            <td>Bottom</td>
            <td>Connection status indicator</td>
          </tr>
        </tbody>
      </table>

      <h2>Sidebar</h2>
      <p>The sidebar provides navigation and quick access to key features:</p>

      <h3>App Logo & Collapse</h3>
      <ul>
        <li>Click the logo to return home</li>
        <li>Click the collapse button to minimize the sidebar</li>
      </ul>

      <h3>Home Button</h3>
      <p>Returns you to your configured home directory.</p>

      <h3>Folder Shortcuts</h3>
      <p>
        Quick-access buttons for frequently used folders. Add shortcuts in{' '}
        <Link href="/docs/user/settings" className="text-blue-500 hover:underline">Settings</Link>.
      </p>

      <h3>Folder Tree</h3>
      <p>Expandable tree view for navigating your file system:</p>
      <ul>
        <li>Click the <strong>arrow</strong> to expand/collapse folders</li>
        <li>Click the <strong>folder name</strong> to navigate to it</li>
        <li>The current folder is highlighted</li>
      </ul>

      <h3>Bottom Links</h3>
      <ul>
        <li><strong>File Types</strong>: Manage file categories and prompts</li>
        <li><strong>Logs</strong>: View AI processing logs</li>
        <li><strong>Settings</strong>: Configure the application</li>
        <li><strong>Theme Toggle</strong>: Switch between light and dark mode</li>
      </ul>

      <h2>Header</h2>
      <p>The header provides navigation and actions for the current view:</p>

      <h3>Breadcrumb Navigation</h3>
      <p>Shows your current location in the file system:</p>
      <ul>
        <li>Click any folder name to jump directly to it</li>
        <li>The home icon returns to the root</li>
      </ul>

      <h3>Quick Actions</h3>
      <ul>
        <li><strong>Docs</strong>: Open this documentation</li>
        <li><strong>History</strong>: View recent file operations</li>
        <li><strong>Performance</strong>: View system metrics</li>
      </ul>

      <h3>View Controls</h3>
      <ul>
        <li><strong>Tree</strong>: Toggle folder tree visibility</li>
        <li><strong>Sort</strong>: Change file sort order</li>
        <li><strong>Grid/List View</strong>: Toggle between card and table layouts</li>
      </ul>

      <h3>Selection Actions</h3>
      <p>Appear when files are selected:</p>
      <ul>
        <li><strong>Delete</strong>: Remove selected files</li>
        <li><strong>Skip / Revert to Original</strong>: Dismiss AI suggestions</li>
        <li><strong>Generate Name</strong>: Generate AI names for selected files</li>
        <li><strong>Approve Name</strong>: Apply pending name changes</li>
      </ul>

      <h2>File Browser</h2>
      <p>The main content area displays files organized into sections:</p>

      <h3>Toolbar</h3>
      <ul>
        <li><strong>Checkbox</strong>: Select/deselect all files</li>
        <li><strong>Selection count</strong>: Shows &quot;X selected&quot;</li>
        <li><strong>Search</strong>: Filter files by name</li>
        <li><strong>Filter dropdown</strong>: Filter by status (All, Processing, Ready, etc.)</li>
        <li><strong>Item count</strong>: Total items in current folder</li>
      </ul>

      <h3>File Sections</h3>
      <p>Files are grouped by their processing status:</p>
      <table>
        <thead>
          <tr>
            <th>Section</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Folders</strong></td>
            <td>Subfolders in the current directory</td>
          </tr>
          <tr>
            <td><strong>Processing</strong></td>
            <td>Files currently being analyzed by AI</td>
          </tr>
          <tr>
            <td><strong>Pending Approval</strong></td>
            <td>Files with generated names waiting for approval</td>
          </tr>
          <tr>
            <td><strong>Unprocessed</strong></td>
            <td>Files that haven&apos;t been analyzed yet</td>
          </tr>
        </tbody>
      </table>

      <h3>File Cards</h3>
      <p>Each file is displayed as a card showing:</p>
      <ul>
        <li><strong>Thumbnail</strong>: Preview image (for supported types)</li>
        <li><strong>Filename</strong>: Original name</li>
        <li><strong>Suggested name</strong>: AI-generated name (if processed)</li>
        <li><strong>Checkbox</strong>: For selection</li>
        <li><strong>Actions</strong>: Preview, rename, generate, delete buttons</li>
      </ul>

      <h2>Status Bar</h2>
      <p>Located at the bottom of the sidebar:</p>
      <ul>
        <li><strong>Green indicator</strong>: &quot;Ollama Connected&quot; - ready to process</li>
        <li><strong>Red indicator</strong>: &quot;Disconnected&quot; - check Ollama/server</li>
      </ul>

      <h2>Keyboard Shortcuts</h2>
      <table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>Escape</code></td>
            <td>Clear selection / Cancel edit</td>
          </tr>
          <tr>
            <td><code>Enter</code></td>
            <td>Confirm edit / Open folder</td>
          </tr>
          <tr>
            <td><code>Delete</code></td>
            <td>Delete selected files</td>
          </tr>
        </tbody>
      </table>

      <h2>Theme Modes</h2>
      <p>Toggle between light and dark mode using the sun/moon icon at the bottom of the sidebar.</p>
      <ul>
        <li><strong>Light mode</strong>: Bright background, dark text</li>
        <li><strong>Dark mode</strong>: Dark background, light text (default)</li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/user/file-browser" className="text-blue-500 hover:underline">
            File Browser
          </Link>{' '}
          - Learn navigation and file selection
        </li>
        <li>
          <Link href="/docs/user/ai-processing" className="text-blue-500 hover:underline">
            AI Processing
          </Link>{' '}
          - Generate and apply AI names
        </li>
      </ul>
    </div>
  );
}

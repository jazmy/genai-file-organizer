import Link from 'next/link';

export default function FileBrowserPage() {
  return (
    <div className="docs-content">
      <h1>File Browser</h1>
      <p className="lead">
        The file browser is the heart of GenAI File Organizer. Learn how to navigate folders, select files, filter results, and perform bulk operations.
      </p>

      <h2>Navigation</h2>
      <h3>Using the Folder Tree</h3>
      <p>The sidebar contains an expandable folder tree:</p>
      <ul>
        <li>Click the <strong>arrow icon</strong> to expand or collapse a folder</li>
        <li>Click the <strong>folder name</strong> to navigate to that folder</li>
        <li>The current folder is highlighted with a blue background</li>
      </ul>

      <h3>Using Breadcrumbs</h3>
      <p>The breadcrumb path in the header shows your current location:</p>
      <ul>
        <li>Click any folder name to jump directly to it</li>
        <li>Click the <strong>home icon</strong> to return to the root directory</li>
      </ul>

      <h3>Using Shortcuts</h3>
      <p>
        Folder shortcuts in the sidebar provide one-click access to frequently used folders.
        Configure shortcuts in{' '}
        <Link href="/docs/user/settings" className="text-blue-500 hover:underline">Settings</Link>.
      </p>

      <h3>Double-Click Navigation</h3>
      <p>Double-click any folder in the file browser to open it.</p>

      <h2>View Modes</h2>
      <p>Toggle between views using the buttons in the header toolbar:</p>

      <h3>Grid View</h3>
      <ul>
        <li>Files displayed as cards with thumbnails</li>
        <li>Best for visual files (images, screenshots)</li>
        <li>Shows preview on hover</li>
      </ul>

      <h3>List View</h3>
      <ul>
        <li>Files displayed in a compact table format</li>
        <li>Shows more files at once</li>
        <li>Includes file size and date columns</li>
      </ul>

      <h2>Sorting Files</h2>
      <p>Click the <strong>Sort</strong> button in the header to change the sort order:</p>
      <table>
        <thead>
          <tr>
            <th>Sort Option</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Name (A-Z)</strong></td>
            <td>Alphabetical order</td>
          </tr>
          <tr>
            <td><strong>Name (Z-A)</strong></td>
            <td>Reverse alphabetical</td>
          </tr>
          <tr>
            <td><strong>Size (Smallest)</strong></td>
            <td>Smallest files first</td>
          </tr>
          <tr>
            <td><strong>Size (Largest)</strong></td>
            <td>Largest files first</td>
          </tr>
          <tr>
            <td><strong>Date (Newest)</strong></td>
            <td>Most recently modified first</td>
          </tr>
          <tr>
            <td><strong>Date (Oldest)</strong></td>
            <td>Oldest files first</td>
          </tr>
          <tr>
            <td><strong>Type</strong></td>
            <td>Grouped by file extension</td>
          </tr>
        </tbody>
      </table>

      <h2>Filtering Files</h2>
      <img
        src="/docs/filter-dropdown.png"
        alt="Filter Dropdown"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h3>Filter by Status</h3>
      <p>Use the filter dropdown to show specific file categories:</p>
      <ul>
        <li><strong>All</strong>: Show all files</li>
        <li><strong>Processing</strong>: Files currently being analyzed</li>
        <li><strong>Pending Approval</strong>: Files with suggestions waiting for approval</li>
        <li><strong>Unprocessed</strong>: Files that haven&apos;t been analyzed</li>
        <li><strong>Completed</strong>: Files that have been renamed</li>
      </ul>

      <h3>Search</h3>
      <p>Type in the search box to filter files by name. The search is case-insensitive and matches any part of the filename.</p>

      <h2>Selecting Files</h2>
      <h3>Single Selection</h3>
      <p>Click on any file card to select it. The card will show a checkbox.</p>

      <h3>Multiple Selection</h3>
      <ul>
        <li><strong>Checkbox</strong>: Click the checkbox on each file card</li>
        <li><strong>Select All (Section)</strong>: Click &quot;Select All&quot; in a section header to select all files in that section</li>
        <li><strong>Select All (Global)</strong>: Use the checkbox in the toolbar to select/deselect all visible files</li>
      </ul>

      <h3>Selection Counter</h3>
      <p>The toolbar shows:</p>
      <ul>
        <li>Number of files selected</li>
        <li>Number ready to apply</li>
      </ul>

      <h2>File Sections</h2>
      <p>The file browser organizes files into sections based on their status:</p>

      <h3>Folders</h3>
      <p>Subfolders in the current directory. Double-click to navigate.</p>

      <h3>Processing</h3>
      <p>Files currently being analyzed by the AI. Shows a loading indicator.</p>

      <h3>Pending Approval</h3>
      <p>Files with AI-generated name suggestions. Displays:</p>
      <ul>
        <li>Original filename</li>
        <li>Suggested filename (editable)</li>
        <li>Apply/reject buttons</li>
      </ul>

      <h3>Unprocessed</h3>
      <p>Files that haven&apos;t been analyzed yet. Ready to be processed.</p>

      <h2>File Actions</h2>
      <p>Each file card has action buttons (visible on hover):</p>

      <h3>Individual Actions</h3>
      <table>
        <thead>
          <tr>
            <th>Button</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Preview</strong> (eye icon)</td>
            <td>Open file preview modal</td>
          </tr>
          <tr>
            <td><strong>Rename</strong> (pencil icon)</td>
            <td>Manually rename the file</td>
          </tr>
          <tr>
            <td><strong>Generate</strong> (sparkle icon)</td>
            <td>Generate AI name for this file</td>
          </tr>
          <tr>
            <td><strong>Delete</strong> (trash icon)</td>
            <td>Delete the file</td>
          </tr>
        </tbody>
      </table>

      <h3>Bulk Actions (Header)</h3>
      <p>When files are selected, these buttons appear in the header:</p>
      <table>
        <thead>
          <tr>
            <th>Button</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Delete</strong></td>
            <td>Delete all selected files</td>
          </tr>
          <tr>
            <td><strong>Skip / Revert to Original</strong></td>
            <td>Dismiss suggestions, keep original names</td>
          </tr>
          <tr>
            <td><strong>Generate Name</strong></td>
            <td>Generate AI names for all selected files</td>
          </tr>
          <tr>
            <td><strong>Approve Name</strong></td>
            <td>Apply all pending name changes</td>
          </tr>
        </tbody>
      </table>

      <h2>Direct Rename</h2>
      <p>Rename files manually without using AI:</p>
      <ol>
        <li>Click the <strong>pencil icon</strong> on any file</li>
        <li>Type the new filename</li>
        <li>Press <strong>Enter</strong> to save</li>
        <li>Press <strong>Escape</strong> to cancel</li>
      </ol>

      <h2>File Preview</h2>
      <p>Click the <strong>eye icon</strong> or the thumbnail to open a preview modal:</p>
      <ul>
        <li><strong>Images</strong>: Full-size preview with zoom</li>
        <li><strong>Documents</strong>: Text content preview</li>
        <li><strong>Code</strong>: Syntax-highlighted preview</li>
      </ul>

      <h2>Tips</h2>
      <ul>
        <li>Use <strong>Grid view</strong> for visual files, <strong>List view</strong> for documents</li>
        <li>Filter by <strong>Unprocessed</strong> to focus on new files</li>
        <li>Use <strong>Select All</strong> in section headers for efficient bulk operations</li>
        <li>Add folders you use frequently as <strong>shortcuts</strong></li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/user/ai-processing" className="text-blue-500 hover:underline">
            AI Processing
          </Link>{' '}
          - Learn how to generate and apply AI names
        </li>
        <li>
          <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">
            File Types
          </Link>{' '}
          - Customize file categories and prompts
        </li>
      </ul>
    </div>
  );
}

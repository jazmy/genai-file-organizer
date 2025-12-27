import Link from 'next/link';

export default function FileTypesPage() {
  return (
    <div className="docs-content">
      <h1>File Types & Customization</h1>
      <p className="lead">
        GenAI File Organizer uses AI to categorize files and generate appropriate names. You can fully customize how files are categorized, named, and organized.
      </p>

      <h2>Accessing File Types</h2>
      <p>Click <strong>&quot;File Types&quot;</strong> in the sidebar footer to open the File Types management page.</p>

      <img
        src="/docs/file-types.png"
        alt="File Types Management Page"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Organization Settings</h2>
      <p>At the top of the File Types page, you&apos;ll find two global toggles:</p>
      <table>
        <thead>
          <tr>
            <th>Setting</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Auto-Organize</strong></td>
            <td>When enabled, files are automatically moved to their designated folders after renaming</td>
          </tr>
          <tr>
            <td><strong>Create Missing Folders</strong></td>
            <td>Automatically creates destination folders if they don&apos;t exist</td>
          </tr>
        </tbody>
      </table>

      <h2>Understanding File Types</h2>
      <p>Each file type has four customizable properties:</p>

      <h3>1. Category Name</h3>
      <p>The internal identifier for the file type:</p>
      <ul>
        <li>Used in the filename prefix (e.g., <code>invoice</code> → <code>inv_</code>)</li>
        <li>Use lowercase with underscores (e.g., <code>meeting_notes</code>)</li>
        <li>Keep names short and descriptive</li>
      </ul>

      <h3>2. Category Description</h3>
      <p>A hint that helps the AI decide which files belong in this category:</p>
      <ul>
        <li><strong>invoice</strong>: &quot;ANY purchase-related document: receipts, orders, invoices, bills, confirmations&quot;</li>
        <li><strong>meeting_notes</strong>: &quot;meeting notes, minutes, agendas, action items from meetings&quot;</li>
        <li><strong>screenshot</strong>: &quot;screenshots, screen captures, screen recordings&quot;</li>
      </ul>
      <p>The more descriptive your category description, the better the AI will categorize files.</p>

      <h3>3. Folder Destination</h3>
      <p>Where files of this type should be moved when Auto-Organize is enabled:</p>
      <ul>
        <li>Use relative paths starting with <code>./</code></li>
        <li>Examples: <code>./Documents/Invoices</code>, <code>./Screenshots</code></li>
        <li>Leave empty to keep files in their original location</li>
      </ul>

      <h3>4. Filename Generation Prompt</h3>
      <p>The AI prompt that controls how filenames are generated:</p>
      <ul>
        <li>Specifies the naming format</li>
        <li>Defines what information to extract</li>
        <li>Sets the output structure</li>
      </ul>

      <h2>Default File Types</h2>
      <p>GenAI File Organizer comes with 30+ pre-configured file types:</p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Description</th>
            <th>Example Output</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>screenshot</code></td>
            <td>Screen captures</td>
            <td><code>ss_slack_conversation_2024-03-15.png</code></td>
          </tr>
          <tr>
            <td><code>invoice</code></td>
            <td>Receipts, orders, bills</td>
            <td><code>inv_amazon_laptop_2024-03-10.pdf</code></td>
          </tr>
          <tr>
            <td><code>meeting_notes</code></td>
            <td>Meeting minutes and agendas</td>
            <td><code>meeting_product_sprint-planning_2024-03-12.txt</code></td>
          </tr>
          <tr>
            <td><code>report</code></td>
            <td>Reports and analysis</td>
            <td><code>report_q1-sales_regional_2024-03-01.xlsx</code></td>
          </tr>
          <tr>
            <td><code>photo</code></td>
            <td>Photographs and images</td>
            <td><code>img_sunset_beach_2024-03-15.jpg</code></td>
          </tr>
          <tr>
            <td><code>document</code></td>
            <td>General documents</td>
            <td><code>doc_project-proposal_v2_2024-03-14.docx</code></td>
          </tr>
          <tr>
            <td><code>code</code></td>
            <td>Source code files</td>
            <td><code>code_auth-service_login_2024-03-15.js</code></td>
          </tr>
        </tbody>
      </table>

      <h3>Default vs Custom</h3>
      <ul>
        <li><strong>Default types</strong> show a &quot;Default&quot; badge and can be modified or reset</li>
        <li><strong>Custom types</strong> show a &quot;Custom&quot; badge and can be edited or deleted</li>
      </ul>

      <h2>Creating a New File Type</h2>
      <ol>
        <li>Click <strong>&quot;Add File Type&quot;</strong> button</li>
        <li>Fill in the form:
          <ul>
            <li><strong>Type Name</strong>: Use lowercase with underscores (e.g., <code>legal_document</code>)</li>
            <li><strong>Category Description</strong>: Describe what files belong here</li>
            <li><strong>Folder Destination</strong>: Where to move these files (optional)</li>
            <li><strong>Filename Prompt</strong>: How to generate names</li>
          </ul>
        </li>
        <li>Click <strong>&quot;Create File Type&quot;</strong></li>
      </ol>

      <h3>Example: Creating a Custom Type</h3>
      <p>Let&apos;s create a type for expense reports:</p>
      <pre><code>{`Name: expense_report
Description: Employee expense reports, reimbursement requests, travel expenses
Folder: ./Finance/Expenses
Prompt: Generate a filename for this EXPENSE REPORT.

Format: expense_[employee-name]_[expense-type]_[date].ext
- employee-name: Name of the person submitting
- expense-type: Category of expense (travel, supplies, meals)
- date: Date of submission in YYYY-MM-DD

Output ONLY the filename, nothing else.`}</code></pre>

      <h2>Editing File Types</h2>
      <ol>
        <li>Click on any file type in the list</li>
        <li>Modify the fields as needed</li>
        <li>Click <strong>&quot;Save&quot;</strong></li>
      </ol>

      <h3>Resetting to Default</h3>
      <p>For default file types you&apos;ve modified:</p>
      <ol>
        <li>Click on the file type</li>
        <li>Click <strong>&quot;Reset to Default&quot;</strong></li>
        <li>The original prompt and description are restored</li>
      </ol>

      <h2>Prompt Version History</h2>
      <p>Every change to a prompt is automatically tracked:</p>
      <ul>
        <li><strong>View History</strong>: Click the history icon on any prompt to see all versions</li>
        <li><strong>Compare Versions</strong>: Select two versions to see a side-by-side diff</li>
        <li><strong>Rollback</strong>: Restore any previous version with one click</li>
        <li><strong>Track Changes</strong>: See when changes were made and the previous content</li>
      </ul>

      <h3>Version History Features</h3>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Version Number</strong></td>
            <td>Increments with each save</td>
          </tr>
          <tr>
            <td><strong>Timestamp</strong></td>
            <td>When the change was made</td>
          </tr>
          <tr>
            <td><strong>Previous Content</strong></td>
            <td>Full text of the previous version</td>
          </tr>
          <tr>
            <td><strong>Diff View</strong></td>
            <td>Side-by-side comparison of changes</td>
          </tr>
        </tbody>
      </table>
      <p>This helps you track prompt experiments and easily revert if a change makes results worse.</p>

      <h2>Writing Effective Prompts</h2>
      <h3>Prompt Structure</h3>
      <p>A good naming prompt includes:</p>
      <ol>
        <li><strong>Context</strong>: What type of file this is</li>
        <li><strong>Format specification</strong>: The exact naming pattern</li>
        <li><strong>Field definitions</strong>: What each part should contain</li>
        <li><strong>Output instruction</strong>: &quot;Output ONLY the filename&quot;</li>
      </ol>

      <h3>Example Prompt</h3>
      <pre><code>{`Generate a filename for this INVOICE/RECEIPT.

Format: inv_[vendor]_[item-description]_[date].ext
- vendor: Company name (lowercase, hyphenated)
- item-description: Brief description of purchase (lowercase, hyphenated)
- date: Purchase date in YYYY-MM-DD format

Examples:
- inv_amazon_laptop-charger_2024-03-15.pdf
- inv_staples_office-supplies_2024-03-10.jpg

Output ONLY the filename, nothing else.`}</code></pre>

      <h3>Tips for Better Prompts</h3>
      <ul>
        <li><strong>Be specific</strong>: Clearly define each filename component</li>
        <li><strong>Include examples</strong>: Show the AI what good filenames look like</li>
        <li><strong>Use consistent formatting</strong>: lowercase, hyphens for spaces</li>
        <li><strong>Specify date format</strong>: Always use YYYY-MM-DD</li>
        <li><strong>End with output instruction</strong>: Prevents extra text in output</li>
      </ul>

      <h2>Auto-Organization</h2>
      <h3>How It Works</h3>
      <p>When Auto-Organize is enabled:</p>
      <ol>
        <li>File is categorized by AI</li>
        <li>New filename is generated</li>
        <li>File is renamed AND moved to the category&apos;s destination folder</li>
      </ol>

      <h3>Setting Up Destinations</h3>
      <p>Configure folder destinations for each category:</p>
      <ul>
        <li>Screenshots → <code>./Screenshots</code></li>
        <li>Invoices → <code>./Finance/Invoices</code></li>
        <li>Meeting Notes → <code>./Work/Meetings</code></li>
        <li>Photos → <code>./Photos/[year]</code></li>
      </ul>

      <h3>Create Missing Folders</h3>
      <p>Enable this option to automatically create destination folders that don&apos;t exist yet.</p>

      <h2>Best Practices</h2>
      <ol>
        <li><strong>Be specific in descriptions</strong>: The more specific, the better the AI categorizes</li>
        <li><strong>Use consistent formats</strong>: Keep naming patterns similar across categories</li>
        <li><strong>Set folder destinations</strong>: Take advantage of auto-organization</li>
        <li><strong>Test with small batches</strong>: Verify results before processing many files</li>
        <li><strong>Review effectiveness</strong>: Use the{' '}
          <Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">
            Effectiveness tab
          </Link>{' '}
          to track performance
        </li>
      </ol>

      <h2>Transcript vs Meeting Notes</h2>
      <p>GenAI File Organizer distinguishes between these related but different file types:</p>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Characteristics</th>
            <th>Prefix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>transcript</strong></td>
            <td>Verbatim recordings with timestamps and speaker labels (e.g., &quot;00:00 John: Hello&quot;)</td>
            <td><code>transcript_</code></td>
          </tr>
          <tr>
            <td><strong>meeting_notes</strong></td>
            <td>Summarized content with bullet points, action items, agendas - NOT verbatim</td>
            <td><code>meeting_</code></td>
          </tr>
        </tbody>
      </table>
      <p>If files are being miscategorized, check the category descriptions to ensure clear distinction.</p>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/user/settings" className="text-blue-500 hover:underline">
            Settings
          </Link>{' '}
          - Configure app preferences
        </li>
        <li>
          <Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">
            Effectiveness Tracking
          </Link>{' '}
          - Monitor prompt performance
        </li>
      </ul>
    </div>
  );
}

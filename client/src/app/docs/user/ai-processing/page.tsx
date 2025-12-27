import Link from 'next/link';

export default function AIProcessingPage() {
  return (
    <div className="docs-content">
      <h1>AI Processing</h1>
      <p className="lead">
        GenAI File Organizer uses vision-language AI models to analyze your files and generate meaningful, descriptive filenames. Learn how the AI works and how to get the best results.
      </p>

      <h2>How It Works</h2>
      <p>When you click <strong>Generate Name</strong>, the AI performs two steps:</p>

      <h3>Step 1: Categorization</h3>
      <p>The AI analyzes the file content to determine its category:</p>
      <ul>
        <li>Images are visually analyzed</li>
        <li>Documents have text extracted</li>
        <li>The AI matches content to one of 30+ predefined categories</li>
      </ul>

      <h3>Step 2: Name Generation</h3>
      <p>Using the detected category, a specialized prompt generates the filename:</p>
      <ul>
        <li>Each category has a tailored naming prompt</li>
        <li>The AI extracts key details (dates, names, topics)</li>
        <li>A structured filename is generated</li>
      </ul>

      <h2>Processing Different File Types</h2>
      <table>
        <thead>
          <tr>
            <th>File Type</th>
            <th>How It&apos;s Analyzed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Images</strong> (PNG, JPG, WEBP)</td>
            <td>Vision AI analyzes visual content, text, and context</td>
          </tr>
          <tr>
            <td><strong>Screenshots</strong></td>
            <td>Detects app name, content type, and relevant details</td>
          </tr>
          <tr>
            <td><strong>PDFs</strong></td>
            <td>Text extraction and content summarization</td>
          </tr>
          <tr>
            <td><strong>Documents</strong> (DOCX, TXT)</td>
            <td>Full text analysis and topic detection</td>
          </tr>
          <tr>
            <td><strong>Spreadsheets</strong> (XLSX, CSV)</td>
            <td>Header and content analysis</td>
          </tr>
          <tr>
            <td><strong>Code</strong> (JS, PY, etc.)</td>
            <td>File structure, imports, and purpose detection</td>
          </tr>
          <tr>
            <td><strong>Audio</strong> (MP3, WAV)</td>
            <td>Metadata or Whisper transcription</td>
          </tr>
          <tr>
            <td><strong>Video</strong> (MP4, MOV)</td>
            <td>Keyframe extraction and visual analysis</td>
          </tr>
        </tbody>
      </table>

      <h2>Naming Convention</h2>
      <p>Generated filenames follow this format:</p>
      <pre><code>[prefix]_[primary]_[secondary]_[date].[ext]</code></pre>

      <h3>Category Prefixes</h3>
      <table>
        <thead>
          <tr>
            <th>Prefix</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>ss_</code></td><td>Screenshots</td></tr>
          <tr><td><code>img_</code></td><td>Photos and images</td></tr>
          <tr><td><code>doc_</code></td><td>Documents</td></tr>
          <tr><td><code>inv_</code></td><td>Invoices and receipts</td></tr>
          <tr><td><code>code_</code></td><td>Source code files</td></tr>
          <tr><td><code>vid_</code></td><td>Videos</td></tr>
          <tr><td><code>aud_</code></td><td>Audio files</td></tr>
          <tr><td><code>report_</code></td><td>Reports and analysis</td></tr>
          <tr><td><code>meeting_</code></td><td>Meeting notes</td></tr>
        </tbody>
      </table>

      <h3>Example Filenames</h3>
      <ul>
        <li><code>ss_slack-conversation_project-update_2024-03-15.png</code></li>
        <li><code>inv_amazon_laptop-purchase_2024-03-10.pdf</code></li>
        <li><code>report_q1-sales_regional-breakdown_2024-03-01.xlsx</code></li>
        <li><code>meeting_product-team_sprint-planning_2024-03-12.txt</code></li>
      </ul>

      <h2>Generating Names</h2>
      <h3>Single File</h3>
      <ol>
        <li>Hover over a file card</li>
        <li>Click the <strong>sparkle icon</strong></li>
        <li>Wait for processing to complete</li>
      </ol>

      <h3>Multiple Files</h3>
      <ol>
        <li>Select files using checkboxes</li>
        <li>Click <strong>Generate Name</strong> in the header</li>
        <li>Files move to &quot;Processing&quot; section</li>
        <li>When complete, they appear in &quot;Pending Approval&quot;</li>
      </ol>

      <h3>Processing Indicator</h3>
      <p>While processing:</p>
      <ul>
        <li>Files show a loading spinner</li>
        <li>The &quot;Processing&quot; section shows count</li>
        <li>Status bar may show processing activity</li>
      </ul>

      <h2>Reviewing Suggestions</h2>
      <img
        src="/docs/file-selected.png"
        alt="File with suggestion"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <p>In the &quot;Pending Approval&quot; section, each file shows:</p>
      <ul>
        <li><strong>Original name</strong>: Current filename</li>
        <li><strong>Suggested name</strong>: AI-generated name</li>
        <li><strong>Category badge</strong>: Detected file type</li>
      </ul>

      <h3>Editing Suggestions</h3>
      <p>Click on the suggested name to edit it before applying:</p>
      <ol>
        <li>Click the suggested filename text</li>
        <li>Make your changes</li>
        <li>Press Enter or click away to save</li>
      </ol>

      <h2>Applying Changes</h2>
      <h3>Apply Single File</h3>
      <p>Click the <strong>checkmark button</strong> on an individual file card.</p>

      <h3>Approve All</h3>
      <ol>
        <li>Review all suggestions in &quot;Pending Approval&quot;</li>
        <li>Click <strong>Approve Name</strong> in the header</li>
        <li>All files are renamed at once</li>
      </ol>

      <h3>Dismiss Suggestions</h3>
      <ul>
        <li><strong>Single file</strong>: Click the <strong>X button</strong> on the card</li>
        <li><strong>All files</strong>: Select files and click <strong>Skip</strong> (for unprocessed) or <strong>Revert to Original</strong> (for processed)</li>
      </ul>

      <h2>Undo Changes</h2>
      <p>Made a mistake? Use the CLI to undo recent renames:</p>
      <pre><code>{`# View recent history
npm run cli -- history

# Undo a specific rename
npm run cli -- undo <historyId>`}</code></pre>

      <h2>Tips for Better Results</h2>
      <h3>File Quality</h3>
      <ul>
        <li>Clear, high-quality images produce better names</li>
        <li>Screenshots with visible text are easier to categorize</li>
        <li>Documents with clear titles get better names</li>
      </ul>

      <h3>Batch Processing</h3>
      <ul>
        <li>Process similar files together for consistency</li>
        <li>Start with 10-20 files to verify results</li>
        <li>Review suggestions before bulk applying</li>
      </ul>

      <h3>Customization</h3>
      <ul>
        <li>
          Customize prompts in{' '}
          <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">File Types</Link>{' '}
          for better results
        </li>
        <li>Add new categories for specific file types you use often</li>
        <li>Review the{' '}
          <Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">Effectiveness</Link>{' '}
          metrics to identify areas for improvement
        </li>
      </ul>

      <h2>Troubleshooting</h2>
      <h3>AI Not Responding</h3>
      <ul>
        <li>Check the status bar shows &quot;Ollama Connected&quot;</li>
        <li>Verify Ollama is running: <code>ollama serve</code></li>
        <li>Check the model is installed: <code>ollama list</code></li>
      </ul>

      <h3>Slow Processing</h3>
      <ul>
        <li>Large images and videos take longer</li>
        <li>Reduce batch size for faster feedback</li>
        <li>Consider using a faster model</li>
      </ul>

      <h3>Poor Suggestions</h3>
      <ul>
        <li>The file may be unclear or ambiguous</li>
        <li>Try customizing the category prompt</li>
        <li>Check the{' '}
          <Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">AI Logs</Link>{' '}
          to see what the AI detected
        </li>
      </ul>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">
            File Types
          </Link>{' '}
          - Customize categories and prompts
        </li>
        <li>
          <Link href="/docs/logs/effectiveness" className="text-blue-500 hover:underline">
            Effectiveness Tracking
          </Link>{' '}
          - Monitor and improve AI accuracy
        </li>
      </ul>
    </div>
  );
}

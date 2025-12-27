import Link from 'next/link';

export default function EffectivenessPage() {
  return (
    <div className="docs-content">
      <h1>Effectiveness Tracking</h1>
      <p className="lead">
        The Effectiveness tab helps you measure and improve AI naming accuracy. Track acceptance rates, identify problem categories, and iteratively improve your prompts.
      </p>

      <img
        src="/docs/effectiveness-tab.png"
        alt="Effectiveness Tab"
        style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #3f3f46' }}
      />

      <h2>Overall Metrics</h2>
      <p>Top-level metrics show your overall performance:</p>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Acceptance Rate</strong></td>
            <td>Percentage of suggestions accepted without changes</td>
          </tr>
          <tr>
            <td><strong>Accepted</strong></td>
            <td>Number of suggestions used as-is</td>
          </tr>
          <tr>
            <td><strong>Edited</strong></td>
            <td>Number of suggestions modified before applying</td>
          </tr>
          <tr>
            <td><strong>Rejected</strong></td>
            <td>Number of suggestions dismissed entirely</td>
          </tr>
        </tbody>
      </table>

      <h2>Alert System</h2>
      <p>Categories with acceptance rates below 50% are flagged as &quot;needing attention.&quot; These appear as alerts:</p>
      <ul>
        <li><strong>Yellow alert</strong>: 30-50% acceptance rate</li>
        <li><strong>Red alert</strong>: Below 30% acceptance rate</li>
      </ul>
      <p>Click an alert to jump to that category&apos;s details.</p>

      <h2>Performance by Category</h2>
      <p>The table shows detailed statistics for each file category:</p>
      <table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Category</strong></td>
            <td>File type name</td>
          </tr>
          <tr>
            <td><strong>Total</strong></td>
            <td>Number of files processed</td>
          </tr>
          <tr>
            <td><strong>Accepted</strong></td>
            <td>Suggestions used without modification</td>
          </tr>
          <tr>
            <td><strong>Edited</strong></td>
            <td>Suggestions that were modified</td>
          </tr>
          <tr>
            <td><strong>Rejected</strong></td>
            <td>Suggestions that were dismissed</td>
          </tr>
          <tr>
            <td><strong>Skipped</strong></td>
            <td>Files where user kept original name</td>
          </tr>
          <tr>
            <td><strong>Rate</strong></td>
            <td>Acceptance rate percentage</td>
          </tr>
          <tr>
            <td><strong>Avg Edit</strong></td>
            <td>Average Levenshtein distance for edited names</td>
          </tr>
        </tbody>
      </table>

      <h3>Understanding Avg Edit Distance</h3>
      <p>The average edit distance shows how much users typically change suggestions:</p>
      <ul>
        <li><strong>Low (1-5)</strong>: Minor changes (typos, small adjustments)</li>
        <li><strong>Medium (5-15)</strong>: Moderate changes (rewording, adding details)</li>
        <li><strong>High (15+)</strong>: Major changes (complete rewrites)</li>
      </ul>
      <p>High edit distances indicate the AI is missing something important.</p>

      <h2>Recent Rejections & Edits</h2>
      <p>Shows the most recent files where users rejected or edited suggestions:</p>
      <ul>
        <li><strong>File name</strong>: Original file</li>
        <li><strong>Category</strong>: Detected category</li>
        <li><strong>Suggested</strong>: What the AI suggested</li>
        <li><strong>Final</strong>: What the user actually used</li>
        <li><strong>Edit distance</strong>: How many characters were changed</li>
      </ul>
      <p>Use this to understand what&apos;s not working and identify patterns.</p>

      <h2>Improving Prompts</h2>

      <h3>Step 1: Identify Problem Categories</h3>
      <ol>
        <li>Go to the <strong>Effectiveness</strong> tab</li>
        <li>Look for categories with low acceptance rates (highlighted in red/yellow)</li>
        <li>Note the average edit distance</li>
      </ol>

      <h3>Step 2: Analyze Patterns</h3>
      <ol>
        <li>Review <strong>Recent Rejections & Edits</strong> for the problem category</li>
        <li>Compare suggested names vs. final names</li>
        <li>Look for patterns in the changes users make</li>
      </ol>
      <p>Common patterns:</p>
      <ul>
        <li>Missing date information</li>
        <li>Wrong category prefix</li>
        <li>Too generic descriptions</li>
        <li>Missing vendor/source names</li>
      </ul>

      <h3>Step 3: Review AI Logs</h3>
      <ol>
        <li>Click on a file in Recent Rejections</li>
        <li>View the full AI log detail</li>
        <li>Check what information the AI detected</li>
        <li>Identify what was missed or incorrect</li>
      </ol>

      <h3>Step 4: Update the Prompt</h3>
      <ol>
        <li>Go to <strong>Settings &rarr; File Types</strong></li>
        <li>Find the underperforming category</li>
        <li>Edit the <strong>Category Description</strong> to help categorization</li>
        <li>Edit the <strong>Filename Prompt</strong> to generate better names</li>
        <li>Save changes</li>
      </ol>

      <h3>Step 5: Test and Iterate</h3>
      <ol>
        <li>Process a few test files in that category</li>
        <li>Check if the new suggestions are better</li>
        <li>Monitor the Effectiveness tab over time</li>
        <li>Repeat if needed</li>
      </ol>

      <h2>Tips for Better Prompts</h2>

      <h3>Category Descriptions</h3>
      <ul>
        <li><strong>Be specific</strong>: List specific document types that belong</li>
        <li><strong>Use examples</strong>: Include example file types</li>
        <li><strong>Cover edge cases</strong>: Mention related document types</li>
      </ul>
      <p>Example:</p>
      <pre><code>{`# Bad
"invoices"

# Good
"ANY purchase-related document: invoices, receipts, orders,
bills, confirmations, payment records, expense reports"`}</code></pre>

      <h3>Naming Prompts</h3>
      <ul>
        <li><strong>Specify format exactly</strong>: Show the exact naming pattern</li>
        <li><strong>Include examples</strong>: Provide 2-3 example filenames</li>
        <li><strong>Define each component</strong>: Explain what each part should contain</li>
        <li><strong>Specify date format</strong>: Always use YYYY-MM-DD</li>
        <li><strong>End with output instruction</strong>: &quot;Output ONLY the filename, nothing else.&quot;</li>
      </ul>

      <h2>Benchmarking</h2>
      <p>Target metrics for a well-tuned system:</p>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Good</th>
            <th>Excellent</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Overall Acceptance Rate</td>
            <td>&gt; 60%</td>
            <td>&gt; 80%</td>
          </tr>
          <tr>
            <td>Category Acceptance Rate</td>
            <td>&gt; 50%</td>
            <td>&gt; 70%</td>
          </tr>
          <tr>
            <td>Average Edit Distance</td>
            <td>&lt; 10</td>
            <td>&lt; 5</td>
          </tr>
        </tbody>
      </table>

      <h2>API Access</h2>
      <pre><code>{`# Get effectiveness metrics
curl "http://localhost:3001/api/logs/effectiveness"

# Get alerts (categories below threshold)
curl "http://localhost:3001/api/logs/effectiveness/alerts?threshold=50"

# Get recent rejections
curl "http://localhost:3001/api/logs/rejections?limit=20"`}</code></pre>

      <h2>Next Steps</h2>
      <ul>
        <li>
          <Link href="/docs/user/file-types" className="text-blue-500 hover:underline">
            File Types
          </Link>{' '}
          - Edit prompts to improve effectiveness
        </li>
        <li>
          <Link href="/docs/logs/ai-logs" className="text-blue-500 hover:underline">
            AI Logs
          </Link>{' '}
          - View detailed AI responses
        </li>
      </ul>
    </div>
  );
}

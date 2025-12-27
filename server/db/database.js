import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../data/genorganize.db');

// Ensure data directory exists
const dataDir = dirname(DB_PATH);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS processed_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    suggested_name TEXT,
    ai_suggested_name TEXT,
    new_path TEXT,
    category TEXT,
    status TEXT DEFAULT 'pending',
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    applied_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS job_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,
    batch_name TEXT,
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS processing_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'processing',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_processed_original_path ON processed_files(original_path);
  CREATE INDEX IF NOT EXISTS idx_processed_status ON processed_files(status);
  CREATE INDEX IF NOT EXISTS idx_queue_batch ON job_queue(batch_id);
  CREATE INDEX IF NOT EXISTS idx_queue_status ON job_queue(status);
  CREATE INDEX IF NOT EXISTS idx_processing_status_path ON processing_status(file_path);

  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL UNIQUE,
    prompt TEXT NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);

  -- Prompt version history for tracking changes
  CREATE TABLE IF NOT EXISTS prompt_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    version INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    description TEXT,
    change_type TEXT NOT NULL,
    change_reason TEXT,
    changed_by TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_prompt_history_prompt_id ON prompt_history(prompt_id);
  CREATE INDEX IF NOT EXISTS idx_prompt_history_category ON prompt_history(category);
  CREATE INDEX IF NOT EXISTS idx_prompt_history_version ON prompt_history(category, version DESC);

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

  -- AI Logs table for tracking all AI interactions
  CREATE TABLE IF NOT EXISTS ai_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Request identification
    request_id TEXT UNIQUE NOT NULL,
    batch_id TEXT,

    -- File context
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,

    -- Categorization step
    categorization_prompt TEXT,
    categorization_response TEXT,
    detected_category TEXT,
    categorization_time_ms INTEGER,
    categorization_model TEXT,
    categorization_reasoning TEXT,
    llm_category TEXT,

    -- Naming step
    naming_prompt TEXT,
    naming_response TEXT,
    suggested_name TEXT,
    naming_time_ms INTEGER,
    naming_model TEXT,
    naming_reasoning TEXT,

    -- Validation step
    validation_status TEXT,
    validation_prompt TEXT,
    validation_response TEXT,
    validation_passed INTEGER,
    validation_issues TEXT,
    validation_time_ms INTEGER,
    validated_at DATETIME,
    original_suggested_name TEXT,
    corrected_name TEXT,

    -- Regeneration tracking
    is_regeneration INTEGER DEFAULT 0,
    regeneration_feedback TEXT,
    rejected_name TEXT,

    -- Overall metrics
    total_time_ms INTEGER,
    model_used TEXT,

    -- Status
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    error_stack TEXT,

    -- User Feedback
    user_action TEXT,
    final_name TEXT,
    edit_distance INTEGER,
    feedback_at DATETIME,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  -- API call logs
  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Request info
    request_id TEXT UNIQUE NOT NULL,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_body TEXT,
    request_headers TEXT,

    -- Response info
    status_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Context
    user_agent TEXT,
    ip_address TEXT,

    -- Status
    success INTEGER,
    error_message TEXT,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Error logs
  CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Error identification
    error_id TEXT UNIQUE NOT NULL,
    request_id TEXT,

    -- Error details
    error_type TEXT NOT NULL,
    error_code TEXT,
    error_message TEXT NOT NULL,
    error_stack TEXT,

    -- Context
    context TEXT,
    file_path TEXT,

    -- Resolution
    resolved INTEGER DEFAULT 0,
    resolution_notes TEXT,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME
  );

  -- Indexes for logging tables
  CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_status ON ai_logs(status);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_category ON ai_logs(detected_category);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_batch ON ai_logs(batch_id);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_user_action ON ai_logs(user_action);
  CREATE INDEX IF NOT EXISTS idx_ai_logs_file_path ON ai_logs(file_path);
  CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
  CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
`);

// Add description column if it doesn't exist (migration for existing databases)
try {
  db.exec(`ALTER TABLE prompts ADD COLUMN description TEXT`);
  logger.info('Added description column to prompts table');
} catch (e) {
  // Column already exists, ignore
}

// Add ai_suggested_name column if it doesn't exist (migration for existing databases)
try {
  db.exec(`ALTER TABLE processed_files ADD COLUMN ai_suggested_name TEXT`);
  logger.info('Added ai_suggested_name column to processed_files table');
  // Backfill: set ai_suggested_name to suggested_name for existing records
  db.exec(`UPDATE processed_files SET ai_suggested_name = suggested_name WHERE ai_suggested_name IS NULL`);
  logger.info('Backfilled ai_suggested_name for existing records');
} catch (e) {
  // Column already exists, ignore
}

// Default descriptions for each category (used in categorization prompt)
const DEFAULT_DESCRIPTIONS = {
  _global_naming_rules: 'Global rules that apply to ALL filename generation (prepended to every filetype prompt)',
  _filename_validation: 'Filename quality validation rules for checking generated filenames',
  prd: 'product requirements documents, PRDs, specs, feature requirements',
  meeting_notes: 'meeting notes, minutes, agendas, action items from meetings',
  strategy: 'strategy documents, strategic plans, vision docs, roadmaps',
  report: 'reports, analysis, findings, summaries, reviews',
  plan: 'project plans, timelines, schedules, milestones',
  proposal: 'proposals, pitches, business cases, recommendations',
  guide: 'guides, how-tos, tutorials, documentation, manuals, instructions',
  memo: 'memos, internal communications, announcements to team',
  research: 'research papers, studies, whitepapers, academic content',
  transcript: 'transcripts, interview notes, call logs, conversation records',
  template: 'templates, forms, boilerplates, reusable documents',
  feedback: 'feedback, reviews, evaluations, assessments, critiques',
  announcement: 'announcements, press releases, public communications',
  training: 'training materials, courses, learning content, onboarding docs',
  newsletter: 'newsletters, digests, periodic updates, email campaigns',
  draft: 'drafts, work in progress, unfinished documents',
  note: 'quick notes, personal notes, jottings, reminders',
  prompt: 'AI prompts, LLM instructions, prompt templates',
  job_posting: 'job postings, job descriptions, career opportunities, hiring docs',
  mail: 'shipping labels, mailing labels, package labels with carrier info like UPS, USPS, FedEx, DHL',
  invoice: 'ANY purchase-related document: receipts, orders, invoices, bills, confirmations, returns, refunds. Look for: dollar amounts, item prices, order numbers, payment info, store/vendor names',
  infographic: 'visual data presentations, charts, statistics, educational graphics, data visualizations',
  screenshot: 'screenshots of apps, websites, UI, error messages, settings screens',
  photo: 'photos, images of real things, people, places, objects',
  sticker: 'digital stickers, emoji-style graphics, cartoon characters, cute illustrations',
  code: 'source code, scripts, config files, programming files',
  audio: 'music, podcasts, voice recordings, sound files',
  video: 'videos, movies, screen recordings, clips',
  meme: 'memes, humor images, internet jokes',
  design: 'design files, mockups, wireframes, logos, UI designs',
  data: 'data files, CSV exports, spreadsheets with raw data, database exports',
  form: 'forms, official documents with form numbers like W-9, I-9, DS-11',
  invitation: 'invitations, event invites, party invites, wedding invites, RSVP requests',
  photoshop: 'Photoshop files, PSD files, photo edits, composites, retouching projects',
  vector: 'vector files, AI files, SVG files, EPS files, logos, icons, illustrations',
};

// Default prompts to seed the database
const DEFAULT_PROMPTS = {
  // === SYSTEM PROMPT FOR CATEGORIZATION ===
  _categorization: `You are a file categorizer. Analyze the file and select a category from the VALID CATEGORIES list below.

RESPOND WITH EXACTLY THIS JSON FORMAT:
{
  "category": "<category_name>",
  "reasoning": "<brief explanation of why this category was chosen>"
}

=== FILENAME HINTS ===
If the current filename contains a category keyword, give it consideration but ALWAYS verify with content:
- Filename contains "report" -> likely report
- Filename contains "meeting" or "minutes" -> likely meeting_notes
- Filename contains "invoice" or "receipt" -> likely invoice
- Filename contains "prd" or "requirements" -> likely prd

The content is the final authority over filename hints.

=== IMAGE FILE HANDLING ===
Files with image extensions (AVIF, WEBP, PNG, JPG, JPEG, GIF, BMP, TIFF, HEIC, HEIF) - check in order:
1. mail - shipping labels, barcodes, carrier names
2. invoice - receipts, prices, order confirmations
3. screenshot - app UI, website, error message, settings screen
4. infographic - MUST have charts, graphs, statistics, or numerical data displays. NOT photos of people/places.
5. meme - humorous, impact font, internet joke format
6. sticker - cartoon character, emoji-style, cute illustration
7. design - mockup, wireframe, UI design, logo
8. photo - real-world photos of people, animals, places, events, holidays, costumes (use for images without data/charts)

IMPORTANT: A photo of a person (even in costume like Santa) is a PHOTO, not an infographic. Infographics MUST contain data visualizations.

RESPOND WITH ONLY THE JSON. No markdown code blocks. Always include reasoning.
`,

  // === FILENAME VALIDATION PROMPT ===
  _filename_validation: `You are a filename quality validator. Check if the generated filename meets these criteria:

STRUCTURAL RULES:
- Has valid category prefix (note_, report_, photo_, invoice_, etc.)
- No special characters except hyphens and underscores
- Reasonable length (5-100 characters before extension)
- Has proper file extension matching original

CONTENT QUALITY:
- Descriptive of actual content (not generic like "document", "file", "image")
- If content has visible text/title, filename should include key terms
- If image shows identifiable subject (brand, animal, person), filename reflects it
- Brand names included when visible on products

FORMAT:
- Uses underscores between major sections (prefix_description_date)
- Uses hyphens between words within sections
- Date format is YYYY-MM-DD if present

Respond with JSON:
{
  "valid": true/false,
  "reason": "explanation",
  "suggestedFix": "if invalid, what to fix"
}
`,

  // === GLOBAL NAMING RULES (prepended to all filetype prompts) ===
  _global_naming_rules: `=== FILENAME GENERATION RULES ===

ALLOWED CHARACTERS ONLY:
- lowercase letters (a-z)
- numbers (0-9)
- hyphens (-)
- underscores (_)
- ONE period before extension (.pdf, .png, etc.)

FORBIDDEN - NEVER USE THESE IN FILENAMES:
exclamation marks, brackets, equals signs, special symbols, spaces, quotes

REQUIRED FORMAT:
[prefix]_[descriptive-name]_[date-if-available].[ext]

PREFIXES BY CATEGORY:
- mail -> mail_
- invoice -> inv_
- photo -> img_
- screenshot -> ss_
- infographic -> infographic_
- meme -> meme_
- sticker -> sticker_
- design -> design_
- note -> note_
- report -> report_
- prd -> prd_
- meeting_notes -> meeting_
- guide -> guide_
- code -> code_
- video -> vid_
- audio -> aud_

DATE FORMAT: YYYY-MM-DD (e.g., 2024-12-15)

CORRECT EXAMPLES:
- ss_slack-notification_2024-12-24.webp
- note_essay-draft_2024-12-24.doc
- img_electric-vehicle-tesla_2024-12-24.avif
- inv_amazon-order_45-99_2024-12-24.pdf
- mail_ups-john-smith_2024-12-24.png

OUTPUT INSTRUCTION:
Provide ONLY the filename. No explanations, no markdown, no quotes.

`,

  // === DOCUMENT TYPE PROMPTS ===
  prd: `Generate a filename for this PRODUCT REQUIREMENTS DOCUMENT (PRD).

FORMAT: prd_[company]_[product-or-feature]_[version]_[date].ext

RULES:
- company: Company/org name if visible (e.g., google, stripe, internal). Omit if personal.
- product-or-feature: The product or feature being specified
- version: v1, v2, draft, final, etc. if indicated
- date: YYYY-MM-DD format if found
- IMPORTANT: Extract the EXACT title from the document header/title

Examples:
- prd_stripe_payment-api-v2_draft_2024-12-15.pdf
- prd_user-authentication-system_v1_2024-11-20.pdf

Filename:`,

  meeting_notes: `Generate a filename for these MEETING NOTES.

FORMAT: meeting_[team-or-project]_[topic]_[date].ext

RULES:
- team-or-project: Team name, project name, or participants (e.g., engineering, product-team, 1on1-john)
- topic: Main discussion topic or meeting type (standup, planning, retrospective, sync)
- date: YYYY-MM-DD format - REQUIRED, extract from content
- IMPORTANT: Look for attendees, date, and agenda items

Examples:
- meeting_engineering_sprint-planning_2024-12-15.pdf
- meeting_product-team_q4-roadmap-review_2024-12-10.pdf

Filename:`,

  strategy: `Generate a filename for this STRATEGY DOCUMENT.

FORMAT: strategy_[company]_[focus-area]_[timeframe]_[date].ext

RULES:
- company: Company/org name if visible. Omit if personal.
- focus-area: What the strategy covers (growth, product, marketing, etc.)
- timeframe: Q1-2025, 2024, h2-2024, etc. if mentioned
- date: YYYY-MM-DD format if found

Examples:
- strategy_acme_growth-plan_2025_2024-12-15.pdf
- strategy_product-roadmap_q1-2025_2024-12-01.pdf

Filename:`,

  report: `Generate a filename for this REPORT.

FORMAT: report_[company]_[subject]_[period]_[date].ext

RULES:
- company: Company/org name if visible. Omit if personal.
- subject: What the report covers (sales, performance, analysis, audit, etc.)
- period: Time period covered (q4-2024, weekly, monthly, annual)
- date: YYYY-MM-DD format if found

Examples:
- report_acme_quarterly-sales_q4-2024_2024-12-31.pdf
- report_performance-review_annual-2024_2024-12-15.pdf

Filename:`,

  plan: `Generate a filename for this PLAN DOCUMENT.

FORMAT: plan_[company]_[project-or-initiative]_[date].ext

RULES:
- company: Company/org name if visible. Omit if personal.
- project-or-initiative: What's being planned
- date: YYYY-MM-DD format if found

Examples:
- plan_acme_product-launch_2024-12-15.pdf
- plan_website-redesign_q1-2025_2024-12-10.pdf

Filename:`,

  proposal: `Generate a filename for this PROPOSAL.

FORMAT: proposal_[from]_[to]_[subject]_[date].ext

RULES:
- from: Who is proposing (company, person, team)
- to: Who it's for (client name, company) - omit if internal
- subject: What's being proposed
- date: YYYY-MM-DD format if found

Examples:
- proposal_acme_bigcorp_software-development_2024-12-15.pdf
- proposal_marketing-budget-increase_2024-12-10.pdf

Filename:`,

  guide: `Generate a filename for this GUIDE/DOCUMENTATION.

FORMAT: guide_[company]_[topic]_[version]_[date].ext

RULES:
- company: Company/org name if from external source. Omit if personal.
- topic: What the guide covers
- version: v1, v2, etc. if indicated
- date: YYYY-MM-DD format if found

Examples:
- guide_stripe_api-integration_v2_2024-12-15.pdf
- guide_onboarding-new-employees_2024-12-10.pdf

Filename:`,

  memo: `Generate a filename for this MEMO.

FORMAT: memo_[from]_[subject]_[date].ext

RULES:
- from: Who sent it (person, department, leadership)
- subject: Main topic of the memo
- date: YYYY-MM-DD format - REQUIRED for memos

Examples:
- memo_ceo_company-restructuring_2024-12-15.pdf
- memo_hr_holiday-schedule_2024-12-10.pdf

Filename:`,

  research: `Generate a filename for this RESEARCH DOCUMENT.

FORMAT: research_[institution]_[topic]_[date].ext

RULES:
- institution: University, company, or research org if visible
- topic: Research subject/title
- date: YYYY-MM-DD or just year if that's all available

Examples:
- research_stanford_machine-learning-optimization_2024.pdf
- research_user-behavior-analysis_2024-12-15.pdf

Filename:`,

  transcript: `Generate a filename for this TRANSCRIPT.

FORMAT: transcript_[type]_[participants-or-topic]_[date].ext

RULES:
- type: interview, call, meeting, podcast, video, etc.
- participants-or-topic: Who's involved or what it's about
- date: YYYY-MM-DD format if found

Examples:
- transcript_interview_john-smith_2024-12-15.pdf
- transcript_call_customer-support_2024-12-10.pdf

Filename:`,

  template: `Generate a filename for this TEMPLATE.

FORMAT: template_[type]_[purpose]_[version].ext

RULES:
- type: What kind of template (form, doc, email, contract, etc.)
- purpose: What it's used for
- version: v1, v2, etc. if indicated

Examples:
- template_contract_nda_v2.pdf
- template_email_customer-welcome.pdf

Filename:`,

  feedback: `Generate a filename for this FEEDBACK DOCUMENT.

FORMAT: feedback_[type]_[subject]_[from]_[date].ext

RULES:
- type: review, evaluation, assessment, critique, etc.
- subject: What/who is being reviewed
- from: Who gave the feedback (if known)
- date: YYYY-MM-DD format if found

Examples:
- feedback_review_product-demo_client_2024-12-15.pdf
- feedback_evaluation_q4-performance_manager_2024-12-10.pdf

Filename:`,

  announcement: `Generate a filename for this ANNOUNCEMENT.

FORMAT: announcement_[from]_[subject]_[date].ext

RULES:
- from: Who is announcing (company, department, person)
- subject: What's being announced
- date: YYYY-MM-DD format - REQUIRED for announcements

Examples:
- announcement_company_new-ceo_2024-12-15.pdf
- announcement_hr_office-relocation_2024-12-10.pdf

Filename:`,

  training: `Generate a filename for this TRAINING MATERIAL.

FORMAT: training_[topic]_[level]_[module].ext

RULES:
- topic: What's being taught
- level: beginner, intermediate, advanced, or omit if not specified
- module: Module/chapter number or name if applicable

Examples:
- training_sales-techniques_beginner_module1.pdf
- training_python-programming_advanced.pdf

Filename:`,

  newsletter: `Generate a filename for this NEWSLETTER.

FORMAT: newsletter_[source]_[topic-or-edition]_[date].ext

RULES:
- source: Company, publication, or sender name
- topic-or-edition: Issue number, topic, or edition name
- date: YYYY-MM-DD or month-year format

Examples:
- newsletter_acme_monthly-update_2024-12.pdf
- newsletter_techcrunch_weekly-digest_2024-12-15.pdf

Filename:`,

  draft: `Generate a filename for this DRAFT DOCUMENT.

FORMAT: draft_[type]_[title]_[version]_[date].ext

RULES:
- type: What kind of document (article, proposal, report, etc.)
- title: Document title or subject
- version: v1, v2, draft1, wip, etc.
- date: YYYY-MM-DD format if found

Examples:
- draft_article_ai-trends-2025_v2_2024-12-15.pdf
- draft_proposal_client-project_wip_2024-12-10.pdf

Filename:`,

  note: `Generate a filename for this NOTE.

FORMAT: note_[topic]_[date].ext

RULES:
- topic: Main subject or context of the note
- date: YYYY-MM-DD format if found
- Keep it simple and descriptive

Examples:
- note_project-ideas_2024-12-15.pdf
- note_meeting-followup_2024-12-10.pdf

Filename:`,

  prompt: `Generate a filename for this AI PROMPT.

FORMAT: prompt_[model-or-use]_[purpose]_[version].ext

RULES:
- model-or-use: Target model (gpt4, claude, llama) or use case (coding, writing, analysis)
- purpose: What the prompt does
- version: v1, v2, etc. if indicated

Examples:
- prompt_gpt4_code-review_v2.txt
- prompt_claude_writing-assistant_v1.md

Filename:`,

  job_posting: `Generate a filename for this JOB POSTING.

FORMAT: job_[company]_[role]_[location]_[date].ext

RULES:
- company: Hiring company name
- role: Job title (hyphenated)
- location: remote, city name, or region if specified
- date: YYYY-MM-DD format if found

Examples:
- job_google_senior-software-engineer_remote_2024-12-15.pdf
- job_stripe_product-manager_sf_2024-12-10.pdf

Filename:`,

  // === OTHER CATEGORY PROMPTS ===
  mail: `Generate a filename for this SHIPPING LABEL / MAIL.

FORMAT: mail_[carrier]_[recipient-name]_[date].ext

RULES:
- carrier: The shipping carrier (ups, usps, fedex, dhl, ontrac, lasership, etc.)
- recipient-name: Extract the FULL NAME from "SHIP TO" or "DELIVER TO" section (first-last, hyphenated, lowercase)
- date: YYYY-MM-DD format if visible on the label

IMPORTANT:
- Look for "SHIP TO:" or "DELIVER TO:" to find the recipient name
- The carrier is usually prominently displayed (UPS, USPS, FedEx logo or text)
- Ignore tracking numbers, barcodes, and sender information

Examples:
- mail_ups_john-smith_2024-12-15.pdf
- mail_fedex_jane-doe_2024-12-10.pdf
- mail_usps_bob-wilson.pdf

Filename:`,

  invoice: `Generate a filename for this INVOICE/RECEIPT/ORDER.

FORMAT: inv_[vendor]_[item-or-description]_[price]_[date].pdf

RULES:
- vendor: Be SPECIFIC (amazon-pharmacy, amazon, target, costco, walgreens, cvs, etc.)
- item-or-description: Main item purchased OR brief description
- price: Total amount with NO periods - use hyphen for cents (e.g., "45-99"). Omit if not found.
- date: YYYY-MM-DD format - REQUIRED if found

Examples:
- inv_amazon-pharmacy_ozempic_89-99_2024-06-17.pdf
- inv_amazon_echo-dot_29-99_2024-11-26.pdf
- inv_target_groceries_156-43_2024-12-15.pdf

Filename:`,

  infographic: `Generate a filename for this INFOGRAPHIC.

FORMAT: infographic_[topic]_[title-or-subtitle]_[date].ext

RULES:
- topic: main subject (health, finance, technology, marketing, science, etc.)
- title-or-subtitle: Extract the ACTUAL title or headline from the infographic
- date: YYYY-MM-DD if available
- IMPORTANT: Read any text visible in the image and incorporate key terms

CONTEXT CLUES:
- Look at the original filename for hints about the subject
- Read ALL visible text in the image including titles, labels, and captions

Examples:
- infographic_nutrition_daily-vitamin-requirements_2024-12-15.png
- infographic_climate_global-temperature-rise-1900-2024.jpg

Filename:`,

  screenshot: `Generate a filename for this SCREENSHOT.

FORMAT: ss_[app-or-website]_[context]_[date]_[time].png

RULES:
- app-or-website: github, slack, vscode, chrome, netflix, twitter, etc.
- context: what's shown (error-message, settings, pull-request, dashboard, etc.)
- date: YYYY-MM-DD format
- time: HHMM format (24-hour)

CONTEXT CLUES:
- Look at the original filename for date/time hints (e.g., "Screenshot 2024-12-15 at 14.30.45")
- Identify the app from UI elements, logos, or window chrome
- Read any visible text to understand context

Examples:
- ss_github_pull-request-review_2024-12-15_1430.png
- ss_slack_error-message-connection-failed_2024-12-20_0915.png

Filename:`,

  photo: `Generate a filename for this PHOTO.

FORMAT: photo_[main-subject]_[context].ext

=== NOUN PRIORITIZATION (Most Important) ===

The filename MUST prioritize nouns in this order:

1. PRIMARY SUBJECT (WHO/WHAT) - Always include first:
   - PEOPLE: Names, characters, or descriptions (santa-claus, john-smith, woman-in-red-dress)
   - ANIMALS: Species and details (golden-retriever-puppy, monarch-butterfly)
   - OBJECTS: Specific items (vintage-typewriter, red-ferrari, birthday-cake)

2. CONTEXT (WHERE/WHEN) - Include after the subject:
   - EVENTS: Holidays, occasions (christmas, birthday-party, wedding)
   - PLACES: Locations (beach, paris, kitchen)
   - ACTIVITIES: What is happening (hiking, cooking, playing-piano)

=== EXAMPLES ===
- Photo of Santa Claus with Christmas tree -> photo_santa-claus_christmas.jpg (subject first, event second)
- Photo of dog at the beach -> photo_golden-retriever_beach.jpg
- Photo of cake at birthday party -> photo_birthday-cake_party.jpg
- Photo of woman hiking in mountains -> photo_woman-hiking_mountains.jpg

=== PRESERVE CONTEXT FROM ORIGINAL FILENAME ===
If the original filename contains meaningful context (events, dates, places), INCLUDE it:
- Original: "christmas-2024.jpg" showing Santa -> photo_santa-claus_christmas-2024.jpg
- Original: "beach-vacation.jpg" showing family -> photo_family_beach-vacation.jpg

=== ANALYZE THE IMAGE ===

1. IDENTIFY THE MAIN SUBJECT (this goes first in filename):
   - Look for people, animals, or prominent objects
   - Be specific: "santa-claus" not "man", "golden-retriever" not "dog"

2. READ ALL VISIBLE TEXT:
   - Book covers, product labels, signs -> include in filename
   - Example: Book showing "1984" -> photo_1984-book-cover.jpg

3. IDENTIFY CONTEXT from image AND original filename:
   - Events, holidays, locations, activities
   - Combine what you see with context from the original filename

RULES:
- Subject ALWAYS comes before context in the filename
- Use hyphens between words
- Remove special characters (use "and" instead of "&")
- Be specific, not generic
`,

  sticker: `Generate a filename for this STICKER.

FORMAT: sticker_[text-or-subject]_[style].ext

RULES:
- text-or-subject: If the sticker contains text, use that EXACT text (hyphenated, lowercase). Otherwise describe what it depicts.
- style: cute, kawaii, cartoon, flat, 3d, animated, emoji, etc.

IMPORTANT: 
- If there is ANY text visible on the sticker, that text MUST be in the filename!
- Read all text carefully including small text
- Check the original filename for clues about the sticker content

Examples:
- sticker_good-job_cartoon.png
- sticker_thank-you_kawaii.png
- sticker_cat_cute.png (no text, just a cat)

Filename:`,

  code: `Generate a filename for this CODE FILE.

FORMAT: code_[language]_[purpose]_[version].ext

RULES:
- language: python, javascript, typescript, rust, go, etc.
- purpose: what the code does (api-client, data-scraper, utils, config, etc.)
- version: v1, v2, etc. if applicable
- IMPORTANT: Analyze the code to understand its purpose

Examples:
- code_python_data-scraper_v2.py
- code_javascript_api-client.js

Filename:`,

  meme: `Generate a filename for this MEME.

FORMAT: meme_[template-or-description]_[text-summary].ext

RULES:
- template-or-description: Known meme template name OR brief visual description
- text-summary: Key words from the meme text (if any)
- IMPORTANT: Read ALL text in the meme and incorporate key phrases

CONTEXT CLUES:
- Check original filename for hints
- Read top and bottom text
- Identify the meme template if it's a known format

Examples:
- meme_distracted-boyfriend_work-vs-hobbies.jpg
- meme_drake_coding-vs-meetings.jpg
- meme_this-is-fine_monday-morning.png

Filename:`,

  design: `Generate a filename for this DESIGN FILE.

FORMAT: design_[type]-[project-or-subject]-[version].[ext]

RULES:
- type: mockup, wireframe, logo, icon, ui, banner, poster, graphic, illustration
- project-or-subject: describe what the design shows or is for
- version: v1, v2, final, draft (only if version info is visible)
- IMPORTANT: Describe the ACTUAL content of the image, not generic placeholders


`,

  audio: `Generate a filename for this AUDIO FILE.

FORMAT: aud_[type]_[artist-or-source]_[title]_[date].ext

RULES:
- type: song, podcast, recording, voice-memo, audiobook, etc.
- artist-or-source: Artist name, podcast name, or source
- title: Song title, episode name, or description
- date: YYYY-MM-DD if available

CONTEXT CLUES:
- Check original filename for artist, title, episode info

Examples:
- aud_song_beatles_yesterday.mp3
- aud_podcast_tech-talk_ep42-ai-trends_2024-12-15.mp3

Filename:`,

  video: `Generate a filename for this VIDEO FILE.

FORMAT: vid_[type]_[source-or-creator]_[title]_[date].ext

RULES:
- type: movie, clip, recording, tutorial, vlog, etc.
- source-or-creator: Channel name, creator, or source
- title: Video title or description
- date: YYYY-MM-DD if available

CONTEXT CLUES:
- Check original filename for title, creator, date info

Examples:
- vid_tutorial_traversy-media_react-crash-course.mp4
- vid_recording_zoom_team-meeting_2024-12-15.mp4

Filename:`,

  // === NEW CATEGORIES ===
  data: `Generate a filename for this DATA FILE.

FORMAT: data_[subject]_[source]_[date].ext

CRITICAL RULES:
- subject: What the data is about (sales, customers, products, employees, transactions, etc.)
- source: Where it came from if identifiable (company name, system name, export source)
- date: YYYY-MM-DD or YYYY-MM format if available
- CSV files are ALWAYS data files, never notes or documents
- XLS/XLSX with raw data exports should also use this format

Examples:
- data_sales-report_2024-12.csv
- data_customer-list_salesforce_2024-12-15.csv
- data_employee-directory_hr-system_2024.xlsx
- data_product-inventory_2024-12-20.csv
- data_transaction-log_stripe_2024-11.csv
- data_survey-responses_2024-q4.xlsx


`,

  form: `Generate a filename for this FORM.

FORMAT: form_[form-name-or-number]_[purpose-or-system-name]_[version-or-date].ext

CRITICAL: The filename MUST include what the form is FOR, not just its number.

RULES:
- form-name-or-number: Official form number (ds11, w9, i9, 1040) or form letter (Form D, Form A)
- purpose-or-system-name: The system, program, or purpose the form serves
  - Look for system names like "EMCP", "HR", "Performance Evaluation"
  - Extract the main topic from the document title or heading
- version-or-date: Revision number, version, or date if present

EXAMPLES:
- Form D for EMCP Performance Evaluation -> form_d_emcp-performance-evaluation_rev-6-09.doc
- W-9 tax form -> form_w9_tax-identification-request.pdf
- I-9 employment form -> form_i9_employment-eligibility-verification.pdf
- DS-11 passport form -> form_ds11_passport-application.pdf

BAD: form_d_rev-6-09.doc (missing what the form is for)
GOOD: form_d_emcp-performance-evaluation_rev-6-09.doc (includes purpose)

READ the document content to find what system or purpose the form serves.
`,

  invitation: `Generate a filename for this INVITATION.

FORMAT: invite_[event-type]_[host]_[date].ext

CRITICAL RULES:
- event-type: wedding, birthday, party, conference, shower, graduation, holiday-party, etc.
- host: Who is hosting - person name, family name, company, organization
- date: YYYY-MM-DD format of the EVENT date (not when invite was sent)
- Include enough info to understand at a glance: what event, who is hosting, when

Examples:
- invite_wedding_smith-family_2025-06-15.pdf
- invite_birthday_sarah_2025-01-20.png
- invite_holiday-party_acme-corp_2024-12-20.pdf
- invite_conference_ieee_2025-03-10.pdf
- invite_baby-shower_jane-doe_2025-02-10.jpg
- invite_graduation_johnson-family_2025-05-25.pdf


`,

  photoshop: `Generate a filename for this PHOTOSHOP FILE.

FORMAT: psd_[type]_[subject-or-project]_[version].psd

RULES:
- type: edit, composite, retouch, mockup, template, artwork, banner, poster, etc.
- subject-or-project: what the file depicts or is for
- version: v1, v2, final, draft, etc. if visible or implied
- If text is prominent, include key words (hyphenated, lowercase)

CONTEXT CLUES:
- Check original filename for project names or versions
- Look for visible text, brand names, layer names
- Note if it appears to be a template or work-in-progress

Examples (for reference only on formatting):
- psd_edit_portrait-retouching_v2.psd
- psd_composite_product-showcase_final.psd
- psd_template_social-media-banner.psd
- psd_artwork_abstract-background_v1.psd


`,

  vector: `Generate a filename for this VECTOR FILE.

FORMAT: vec_[type]_[subject-or-content]_[version].[KEEP-ORIGINAL-EXTENSION]

RULES:
- type: logo, icon, illustration, pattern, badge, graphic, diagram, etc.
- subject-or-content: what the vector depicts
- version: v1, v2, final, draft, etc. if applicable
- Preserve original extension (.ai, .svg, .eps)
- If text is visible, include key words (hyphenated, lowercase)

CONTEXT CLUES:
- Check original filename for project or brand names
- Look for any text, logos, or recognizable shapes
- Note the style: flat, outline, detailed, minimalist

Examples (for reference only on formatting):
- vec_logo_company-brand_final.ai
- vec_icon_shopping-cart.svg
- vec_illustration_hero-banner_v2.ai
- vec_pattern_geometric-tiles.eps


`,
};

// Seed default prompts - add any missing categories
const promptCount = db.prepare('SELECT COUNT(*) as count FROM prompts').get();
const existingCategories = db.prepare('SELECT category FROM prompts').all().map(r => r.category);
const insertPrompt = db.prepare('INSERT INTO prompts (category, prompt, description, is_default) VALUES (?, ?, ?, 1)');
const updateDefaultPrompt = db.prepare('UPDATE prompts SET prompt = ?, description = COALESCE(description, ?), updated_at = CURRENT_TIMESTAMP WHERE category = ? AND is_default = 1');
const updateDescription = db.prepare('UPDATE prompts SET description = ? WHERE category = ? AND description IS NULL');

if (promptCount.count === 0) {
  // Fresh database - seed all prompts with descriptions
  const seedPrompts = db.transaction(() => {
    for (const [category, prompt] of Object.entries(DEFAULT_PROMPTS)) {
      const description = DEFAULT_DESCRIPTIONS[category] || null;
      insertPrompt.run(category, prompt, description);
    }
  });
  seedPrompts();
  logger.info(`Seeded ${Object.keys(DEFAULT_PROMPTS).length} default prompts`);
} else {
  // Check for new categories and add them, update descriptions for existing
  let addedCount = 0;
  let updatedCount = 0;
  const seedNewPrompts = db.transaction(() => {
    for (const [category, prompt] of Object.entries(DEFAULT_PROMPTS)) {
      const description = DEFAULT_DESCRIPTIONS[category] || null;
      if (!existingCategories.includes(category)) {
        insertPrompt.run(category, prompt, description);
        addedCount++;
      } else {
        // Update existing default prompts with latest version
        updateDefaultPrompt.run(prompt, description, category);
        updatedCount++;
      }
    }
    // Also update descriptions for any prompts that don't have them
    for (const [category, description] of Object.entries(DEFAULT_DESCRIPTIONS)) {
      updateDescription.run(description, category);
    }
  });
  seedNewPrompts();
  if (addedCount > 0) {
    logger.info(`Added ${addedCount} new prompt categories`);
  }
  if (updatedCount > 0) {
    logger.info(`Updated ${updatedCount} default prompts to latest version`);
  }
}

logger.info(`Database initialized at ${DB_PATH}`);

// Prepared statements
const insertProcessed = db.prepare(`
  INSERT INTO processed_files (original_path, original_name, suggested_name, ai_suggested_name, new_path, category, status, error)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateProcessed = db.prepare(`
  UPDATE processed_files 
  SET suggested_name = ?, new_path = ?, category = ?, status = ?, error = ?, updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const markApplied = db.prepare(`
  UPDATE processed_files 
  SET status = 'applied', new_path = ?, applied_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
  WHERE original_path = ?
`);

const insertApplied = db.prepare(`
  INSERT INTO processed_files (original_path, original_name, suggested_name, new_path, category, status, applied_at)
  VALUES (?, ?, ?, ?, 'uncategorized', 'applied', CURRENT_TIMESTAMP)
`);

const getByOriginalPath = db.prepare(`
  SELECT * FROM processed_files WHERE original_path = ? ORDER BY created_at DESC LIMIT 1
`);

const getPending = db.prepare(`
  SELECT p.* FROM processed_files p
  INNER JOIN (
    SELECT original_path, MAX(id) as max_id
    FROM processed_files
    WHERE status = 'pending' OR status = 'previewed'
    GROUP BY original_path
  ) latest ON p.id = latest.max_id
  WHERE p.status = 'pending' OR p.status = 'previewed'
`);

const getRecent = db.prepare(`
  SELECT * FROM processed_files ORDER BY created_at DESC LIMIT ?
`);

const getByDirectory = db.prepare(`
  SELECT p.* FROM processed_files p
  INNER JOIN (
    SELECT original_path, MAX(id) as max_id
    FROM processed_files
    WHERE original_path LIKE ? || '/%'
    AND status IN ('previewed', 'pending')
    GROUP BY original_path
  ) latest ON p.id = latest.max_id
  ORDER BY p.created_at DESC
`);

const getAppliedByDirectory = db.prepare(`
  SELECT * FROM processed_files 
  WHERE (original_path LIKE ? || '/%' OR new_path LIKE ? || '/%')
  AND status IN ('applied', 'skipped')
  ORDER BY applied_at DESC, created_at DESC
`);

// Job queue statements
const insertJob = db.prepare(`
  INSERT INTO job_queue (batch_id, file_path, priority)
  VALUES (?, ?, ?)
`);

const getNextJob = db.prepare(`
  SELECT * FROM job_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 1
`);

const updateJobStatus = db.prepare(`
  UPDATE job_queue SET status = ?, started_at = CASE WHEN ? = 'processing' THEN CURRENT_TIMESTAMP ELSE started_at END,
  completed_at = CASE WHEN ? IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE completed_at END,
  error = ?
  WHERE id = ?
`);

const getJobsByBatch = db.prepare(`
  SELECT * FROM job_queue WHERE batch_id = ?
`);

const getBatchStats = db.prepare(`
  SELECT 
    batch_id,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing
  FROM job_queue WHERE batch_id = ?
`);

const getActiveBatch = db.prepare(`
  SELECT batch_id, COUNT(*) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as remaining
  FROM job_queue 
  WHERE status IN ('pending', 'processing')
  GROUP BY batch_id
  ORDER BY created_at DESC
  LIMIT 1
`);

const getPendingJobs = db.prepare(`
  SELECT * FROM job_queue WHERE status = 'pending' ORDER BY priority DESC, created_at ASC
`);

const clearCompletedJobs = db.prepare(`
  DELETE FROM job_queue WHERE status IN ('completed', 'failed') AND completed_at < datetime('now', '-1 day')
`);

// Processing status statements
const setProcessingStatus = db.prepare(`
  INSERT OR REPLACE INTO processing_status (file_path, status, started_at)
  VALUES (?, 'processing', CURRENT_TIMESTAMP)
`);

const clearProcessingStatus = db.prepare(`
  DELETE FROM processing_status WHERE file_path = ?
`);

const getProcessingFiles = db.prepare(`
  SELECT file_path FROM processing_status WHERE status = 'processing'
`);

const clearStaleProcessing = db.prepare(`
  DELETE FROM processing_status WHERE started_at < datetime('now', '-5 minutes')
`);

// Prompt operations
const getAllPrompts = db.prepare(`
  SELECT id, category, prompt, description, is_default, version, created_at, updated_at FROM prompts ORDER BY category
`);

const getPromptByCategory = db.prepare(`
  SELECT id, category, prompt, description, is_default, version, created_at, updated_at FROM prompts WHERE category = ?
`);

const upsertPrompt = db.prepare(`
  INSERT INTO prompts (category, prompt, description, is_default, updated_at)
  VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
  ON CONFLICT(category) DO UPDATE SET
    prompt = excluded.prompt,
    description = excluded.description,
    is_default = 0,
    updated_at = CURRENT_TIMESTAMP
`);

const resetPromptToDefault = db.prepare(`
  UPDATE prompts SET prompt = ?, description = ?, is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE category = ?
`);

// Settings operations
const getSetting = db.prepare(`
  SELECT key, value, updated_at FROM settings WHERE key = ?
`);

const getAllSettings = db.prepare(`
  SELECT key, value, updated_at FROM settings ORDER BY key
`);

const upsertSetting = db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (?, ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = CURRENT_TIMESTAMP
`);

const deleteSetting = db.prepare(`
  DELETE FROM settings WHERE key = ?
`);

// Default folder rules that map file categories to destination folders
const DEFAULT_FOLDER_RULES = [
  // Document types - all go to Documents subfolder
  { type: 'prd', destination: './Documents/PRDs' },
  { type: 'meeting_notes', destination: './Documents/Meetings' },
  { type: 'strategy', destination: './Documents/Strategy' },
  { type: 'report', destination: './Documents/Reports' },
  { type: 'plan', destination: './Documents/Plans' },
  { type: 'proposal', destination: './Documents/Proposals' },
  { type: 'guide', destination: './Documents/Guides' },
  { type: 'memo', destination: './Documents/Memos' },
  { type: 'research', destination: './Documents/Research' },
  { type: 'transcript', destination: './Documents/Transcripts' },
  { type: 'template', destination: './Documents/Templates' },
  { type: 'feedback', destination: './Documents/Feedback' },
  { type: 'announcement', destination: './Documents/Announcements' },
  { type: 'training', destination: './Documents/Training' },
  { type: 'newsletter', destination: './Documents/Newsletters' },
  { type: 'draft', destination: './Documents/Drafts' },
  { type: 'note', destination: './Documents/Notes' },
  { type: 'prompt', destination: './Documents/Prompts' },
  { type: 'job_posting', destination: './Documents/Jobs' },
  // Image types - all go to Images subfolder
  { type: 'screenshot', destination: './Images/Screenshots' },
  { type: 'photo', destination: './Images/Photos' },
  { type: 'meme', destination: './Images/Memes' },
  { type: 'infographic', destination: './Images/Infographics' },
  { type: 'sticker', destination: './Images/Stickers' },
  { type: 'design', destination: './Images/Design' },
  { type: 'photoshop', destination: './Images/Photoshop' },
  { type: 'vector', destination: './Images/Vector' },
  // Other categories
  { type: 'invoice', destination: './Invoices' },
  { type: 'mail', destination: './Mail' },
  { type: 'code', destination: './Code' },
  { type: 'audio', destination: './Audio' },
  { type: 'video', destination: './Videos' },
];

// Default settings
const DEFAULT_SETTINGS = {
  'ui.defaultPath': '',
  'ui.theme': 'dark',
  'ui.folderShortcuts': '[]',
  'ollama.host': 'http://127.0.0.1:11434',
  'ollama.model': 'qwen3-vl:8b',
  'ollama.model.categorization': '',  // Empty means use default ollama.model
  'ollama.model.naming': '',          // Empty means use default ollama.model
  'ollama.model.regeneration': '',    // Empty means use default ollama.model (or a smarter model)
  'folders.enabled': 'false',
  'folders.createIfMissing': 'true',
  'folders.rules': JSON.stringify(DEFAULT_FOLDER_RULES),
  'processing.enableValidation': 'true',    // Enable AI validation loop
  'processing.validationRetryCount': '3',   // Max retries before giving up (1-10)
};

// Seed default settings if table is empty
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get();
if (settingsCount.count === 0) {
  const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
  const seedSettings = db.transaction(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      insertSetting.run(key, value);
    }
  });
  seedSettings();
  logger.info(`Seeded ${Object.keys(DEFAULT_SETTINGS).length} default settings`);
} else {
  // Ensure folder rules are populated if they're empty
  const folderRules = db.prepare("SELECT value FROM settings WHERE key = 'folders.rules'").get();
  if (folderRules && (folderRules.value === '[]' || folderRules.value === '')) {
    db.prepare("UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'folders.rules'")
      .run(JSON.stringify(DEFAULT_FOLDER_RULES));
    logger.info('Populated empty folder rules with defaults');
  }
}

export const dbOperations = {
  // Processed files operations
  saveProcessedFile(originalPath, originalName, suggestedName, newPath, category, status = 'previewed', error = null, aiSuggestedName = null) {
    // If aiSuggestedName not provided, use suggestedName (first time processing)
    const aiName = aiSuggestedName || suggestedName;
    const result = insertProcessed.run(originalPath, originalName, suggestedName, aiName, newPath, category, status, error);
    return result.lastInsertRowid;
  },

  updateProcessedFile(id, suggestedName, newPath, category, status, error = null) {
    updateProcessed.run(suggestedName, newPath, category, status, error, id);
  },

  markFileApplied(originalPath, newPath) {
    logger.info(`markFileApplied called: originalPath=${originalPath}, newPath=${newPath}`);
    // Try to update existing record first
    const result = markApplied.run(newPath, originalPath);
    logger.info(`markApplied result: changes=${result.changes}`);
    // If no record was updated, insert a new one
    if (result.changes === 0) {
      const originalName = originalPath.split('/').pop() || '';
      const suggestedName = newPath.split('/').pop() || '';
      logger.info(`Inserting new applied record: originalPath=${originalPath}, originalName=${originalName}, suggestedName=${suggestedName}, newPath=${newPath}`);
      insertApplied.run(originalPath, originalName, suggestedName, newPath);
    }
  },

  getProcessedFile(originalPath) {
    return getByOriginalPath.get(originalPath);
  },

  getPendingFiles() {
    return getPending.all();
  },

  getRecentFiles(limit = 100) {
    return getRecent.all(limit);
  },

  getFilesByDirectory(dirPath) {
    return getByDirectory.all(dirPath);
  },

  getAppliedFilesByDirectory(dirPath) {
    return getAppliedByDirectory.all(dirPath, dirPath);
  },

  // Job queue operations
  createBatch(filePaths, priority = 0) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const insertMany = db.transaction((paths) => {
      for (const filePath of paths) {
        insertJob.run(batchId, filePath, priority);
      }
    });
    insertMany(filePaths);
    logger.info(`Created batch ${batchId} with ${filePaths.length} files`);
    return batchId;
  },

  getNextJob() {
    return getNextJob.get();
  },

  updateJobStatus(jobId, status, error = null) {
    updateJobStatus.run(status, status, status, error, jobId);
  },

  getJobsByBatch(batchId) {
    return getJobsByBatch.all(batchId);
  },

  getBatchStats(batchId) {
    return getBatchStats.get(batchId);
  },

  getActiveBatch() {
    return getActiveBatch.get();
  },

  getPendingJobs() {
    return getPendingJobs.all();
  },

  markJobCompleted(jobId) {
    updateJobStatus.run('completed', 'completed', 'completed', null, jobId);
  },

  markJobFailed(jobId, error) {
    updateJobStatus.run('failed', 'failed', 'failed', error, jobId);
  },

  cancelBatch(batchId) {
    // Cancel all pending jobs in a batch
    const cancelPendingJobs = db.prepare(`
      UPDATE job_queue
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
      WHERE batch_id = ? AND status = 'pending'
    `);
    const result = cancelPendingJobs.run(batchId);
    return result.changes;
  },

  clearOldJobs() {
    clearCompletedJobs.run();
  },

  // Reset all data (logs, queues, processed files, shortcuts) while keeping other settings and prompts
  resetAllData() {
    const tables = ['ai_logs', 'api_logs', 'error_logs', 'job_queue', 'processed_files', 'processing_status'];
    let deletedCounts = {};

    for (const table of tables) {
      try {
        const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
        const count = countStmt.get().count;
        const deleteStmt = db.prepare(`DELETE FROM ${table}`);
        deleteStmt.run();
        deletedCounts[table] = count;
      } catch (err) {
        deletedCounts[table] = { error: err.message };
      }
    }

    // Also clear folder shortcuts
    try {
      const clearShortcuts = db.prepare(`UPDATE settings SET value = '[]' WHERE key = 'ui.folderShortcuts'`);
      clearShortcuts.run();
      deletedCounts['folderShortcuts'] = 'cleared';
    } catch (err) {
      deletedCounts['folderShortcuts'] = { error: err.message };
    }

    return deletedCounts;
  },

  // Processing status operations
  setFileProcessing(filePath) {
    setProcessingStatus.run(filePath);
  },

  clearFileProcessing(filePath) {
    clearProcessingStatus.run(filePath);
  },

  getProcessingFiles() {
    // Clear stale entries first (older than 5 minutes)
    clearStaleProcessing.run();
    return getProcessingFiles.all().map(row => row.file_path);
  },

  // Prompt operations
  getAllPrompts() {
    return getAllPrompts.all();
  },

  getPromptByCategory(category) {
    return getPromptByCategory.get(category);
  },

  updatePrompt(category, prompt, description = null) {
    upsertPrompt.run(category, prompt, description);
  },

  resetPromptToDefault(category) {
    const defaultPrompt = DEFAULT_PROMPTS[category];
    const defaultDescription = DEFAULT_DESCRIPTIONS[category] || null;
    if (defaultPrompt) {
      resetPromptToDefault.run(defaultPrompt, defaultDescription, category);
      return true;
    }
    return false;
  },

  getDefaultPrompt(category) {
    return DEFAULT_PROMPTS[category] || null;
  },

  getDefaultDescription(category) {
    return DEFAULT_DESCRIPTIONS[category] || null;
  },

  createPrompt(category, prompt, description = null) {
    const insertNewPrompt = db.prepare('INSERT INTO prompts (category, prompt, description, is_default) VALUES (?, ?, ?, 0)');
    insertNewPrompt.run(category, prompt, description);
  },

  deletePrompt(category) {
    const deletePromptStmt = db.prepare('DELETE FROM prompts WHERE category = ?');
    const result = deletePromptStmt.run(category);
    return result.changes > 0;
  },

  addCategoryToCategorizationPrompt(category, description = 'custom file type') {
    // Get current categorization prompt
    const catPrompt = this.getPromptByCategory('_categorization');
    if (!catPrompt) return;
    
    // Add the new category to the prompt if not already present
    if (!catPrompt.prompt.includes(`- ${category}`)) {
      // Add before "=== PRIORITY RULES ===" section
      const updatedPrompt = catPrompt.prompt.replace(
        '=== PRIORITY RULES ===',
        `- ${category} (${description})\n\n=== PRIORITY RULES ===`
      );
      this.updatePrompt('_categorization', updatedPrompt);
    }
  },

  updateCategoryInCategorizationPrompt(category, description) {
    const catPrompt = this.getPromptByCategory('_categorization');
    if (!catPrompt) return;
    
    // Update the category line with new description
    const updatedPrompt = catPrompt.prompt
      .replace(new RegExp(`- ${category} \\([^)]+\\)`, 'g'), `- ${category} (${description})`);
    this.updatePrompt('_categorization', updatedPrompt);
  },

  removeCategoryFromCategorizationPrompt(category) {
    const catPrompt = this.getPromptByCategory('_categorization');
    if (!catPrompt) return;
    
    // Remove the category line
    const updatedPrompt = catPrompt.prompt
      .replace(new RegExp(`- ${category}[^\n]*\n`, 'g'), '')
      .replace(/\n\n\n+/g, '\n\n'); // Clean up extra newlines
    this.updatePrompt('_categorization', updatedPrompt);
  },

  addFolderRule(category, destination) {
    const rulesJson = this.getSetting('folders.rules') || '[]';
    const rules = JSON.parse(rulesJson);
    // Check if rule already exists
    if (!rules.find(r => r.type === category)) {
      rules.push({ type: category, destination });
      this.setSetting('folders.rules', JSON.stringify(rules));
    }
  },

  removeFolderRule(category) {
    const rulesJson = this.getSetting('folders.rules') || '[]';
    const rules = JSON.parse(rulesJson);
    const filtered = rules.filter(r => r.type !== category);
    this.setSetting('folders.rules', JSON.stringify(filtered));
  },

  // Prompt versioning operations
  updatePromptWithHistory(category, newPrompt, description = null, changeReason = null) {
    const existing = this.getPromptByCategory(category);
    if (!existing) {
      throw new Error(`Prompt category '${category}' not found`);
    }

    const currentVersion = existing.version || 1;
    const newVersion = currentVersion + 1;

    // Save history entry for the old version
    const insertHistory = db.prepare(`
      INSERT INTO prompt_history (prompt_id, category, version, prompt, description, change_type, change_reason, changed_by)
      VALUES (?, ?, ?, ?, ?, 'update', ?, 'user')
    `);
    insertHistory.run(existing.id, category, currentVersion, existing.prompt, existing.description, changeReason);

    // Update the prompt with new version
    const updatePrompt = db.prepare(`
      UPDATE prompts
      SET prompt = ?, description = ?, version = ?, is_default = 0, updated_at = CURRENT_TIMESTAMP
      WHERE category = ?
    `);
    updatePrompt.run(newPrompt, description, newVersion, category);

    return { category, version: newVersion, previousVersion: currentVersion };
  },

  getPromptHistory(category, limit = 20) {
    const stmt = db.prepare(`
      SELECT h.*, p.id as current_prompt_id
      FROM prompt_history h
      LEFT JOIN prompts p ON p.id = h.prompt_id
      WHERE h.category = ?
      ORDER BY h.version DESC
      LIMIT ?
    `);
    return stmt.all(category, limit);
  },

  getPromptVersion(category, version) {
    const stmt = db.prepare(`
      SELECT * FROM prompt_history
      WHERE category = ? AND version = ?
    `);
    return stmt.get(category, version);
  },

  rollbackPrompt(category, toVersion) {
    const targetVersion = this.getPromptVersion(category, toVersion);
    if (!targetVersion) {
      throw new Error(`Version ${toVersion} not found for category '${category}'`);
    }

    const existing = this.getPromptByCategory(category);
    if (!existing) {
      throw new Error(`Prompt category '${category}' not found`);
    }

    const currentVersion = existing.version || 1;
    const newVersion = currentVersion + 1;

    // Save current state to history before rollback
    const insertHistory = db.prepare(`
      INSERT INTO prompt_history (prompt_id, category, version, prompt, description, change_type, change_reason, changed_by)
      VALUES (?, ?, ?, ?, ?, 'rollback', ?, 'user')
    `);
    insertHistory.run(existing.id, category, currentVersion, existing.prompt, existing.description, `Rolled back to version ${toVersion}`);

    // Update prompt to the target version's content but with new version number
    const updatePrompt = db.prepare(`
      UPDATE prompts
      SET prompt = ?, description = ?, version = ?, is_default = 0, updated_at = CURRENT_TIMESTAMP
      WHERE category = ?
    `);
    updatePrompt.run(targetVersion.prompt, targetVersion.description, newVersion, category);

    return {
      category,
      version: newVersion,
      rolledBackFrom: currentVersion,
      rolledBackTo: toVersion,
    };
  },

  comparePromptVersions(category, version1, version2) {
    const v1 = this.getPromptVersion(category, version1);
    const v2 = this.getPromptVersion(category, version2);

    if (!v1) {
      throw new Error(`Version ${version1} not found for category '${category}'`);
    }
    if (!v2) {
      throw new Error(`Version ${version2} not found for category '${category}'`);
    }

    // Simple line-by-line diff
    const lines1 = v1.prompt.split('\n');
    const lines2 = v2.prompt.split('\n');

    const diff = [];
    const maxLines = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';

      if (line1 === line2) {
        diff.push({ type: 'same', line: line1, lineNumber: i + 1 });
      } else if (!lines1[i]) {
        diff.push({ type: 'added', line: line2, lineNumber: i + 1 });
      } else if (!lines2[i]) {
        diff.push({ type: 'removed', line: line1, lineNumber: i + 1 });
      } else {
        diff.push({ type: 'changed', oldLine: line1, newLine: line2, lineNumber: i + 1 });
      }
    }

    return {
      version1: { version: version1, prompt: v1.prompt, description: v1.description, created_at: v1.created_at },
      version2: { version: version2, prompt: v2.prompt, description: v2.description, created_at: v2.created_at },
      diff,
      summary: {
        added: diff.filter(d => d.type === 'added').length,
        removed: diff.filter(d => d.type === 'removed').length,
        changed: diff.filter(d => d.type === 'changed').length,
        same: diff.filter(d => d.type === 'same').length,
      },
    };
  },

  // Settings operations
  getSetting(key) {
    const row = getSetting.get(key);
    return row ? row.value : null;
  },

  getAllSettings() {
    const rows = getAllSettings.all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  getSettingsAsConfig() {
    const settings = this.getAllSettings();
    return {
      provider: {
        type: settings['provider.type'] || 'ollama',
      },
      ui: {
        defaultPath: settings['ui.defaultPath'] || '',
        theme: settings['ui.theme'] || 'dark',
        folderShortcuts: JSON.parse(settings['ui.folderShortcuts'] || '[]'),
      },
      ollama: {
        host: settings['ollama.host'] || 'http://127.0.0.1:11434',
        model: settings['ollama.model'] || 'qwen3-vl:8b',
        categorizationModel: settings['ollama.model.categorization'] || '',
        namingModel: settings['ollama.model.naming'] || '',
        regenerationModel: settings['ollama.model.regeneration'] || '',
      },
      llamaServer: {
        host: settings['llamaServer.host'] || 'http://127.0.0.1:8080',
        parallelSlots: parseInt(settings['llamaServer.parallelSlots'] || '4', 10),
        timeout: parseInt(settings['llamaServer.timeout'] || '180000', 10),
      },
      processing: {
        parallelFiles: parseInt(settings['processing.parallelFiles'] || '3', 10),
      },
      folders: {
        enabled: settings['folders.enabled'] === 'true',
        createIfMissing: settings['folders.createIfMissing'] !== 'false',
        rules: JSON.parse(settings['folders.rules'] || '[]'),
      },
    };
  },

  setSetting(key, value) {
    upsertSetting.run(key, value);
  },

  saveConfigToSettings(config) {
    const transaction = db.transaction(() => {
      if (config.provider) {
        if (config.provider.type !== undefined) {
          upsertSetting.run('provider.type', config.provider.type);
        }
      }
      if (config.ui) {
        if (config.ui.defaultPath !== undefined) {
          upsertSetting.run('ui.defaultPath', config.ui.defaultPath);
        }
        if (config.ui.theme !== undefined) {
          upsertSetting.run('ui.theme', config.ui.theme);
        }
        if (config.ui.folderShortcuts !== undefined) {
          upsertSetting.run('ui.folderShortcuts', JSON.stringify(config.ui.folderShortcuts));
        }
      }
      if (config.ollama) {
        if (config.ollama.host !== undefined) {
          upsertSetting.run('ollama.host', config.ollama.host);
        }
        if (config.ollama.model !== undefined) {
          upsertSetting.run('ollama.model', config.ollama.model);
        }
        if (config.ollama.categorizationModel !== undefined) {
          upsertSetting.run('ollama.model.categorization', config.ollama.categorizationModel);
        }
        if (config.ollama.namingModel !== undefined) {
          upsertSetting.run('ollama.model.naming', config.ollama.namingModel);
        }
        if (config.ollama.regenerationModel !== undefined) {
          upsertSetting.run('ollama.model.regeneration', config.ollama.regenerationModel);
        }
      }
      if (config.llamaServer) {
        if (config.llamaServer.host !== undefined) {
          upsertSetting.run('llamaServer.host', config.llamaServer.host);
        }
        if (config.llamaServer.parallelSlots !== undefined) {
          upsertSetting.run('llamaServer.parallelSlots', String(config.llamaServer.parallelSlots));
        }
        if (config.llamaServer.timeout !== undefined) {
          upsertSetting.run('llamaServer.timeout', String(config.llamaServer.timeout));
        }
      }
      if (config.folders) {
        if (config.folders.enabled !== undefined) {
          upsertSetting.run('folders.enabled', String(config.folders.enabled));
        }
        if (config.folders.createIfMissing !== undefined) {
          upsertSetting.run('folders.createIfMissing', String(config.folders.createIfMissing));
        }
        if (config.folders.rules !== undefined) {
          upsertSetting.run('folders.rules', JSON.stringify(config.folders.rules));
        }
      }
      if (config.processing) {
        if (config.processing.parallelFiles !== undefined) {
          upsertSetting.run('processing.parallelFiles', String(config.processing.parallelFiles));
        }
        if (config.processing.enableValidation !== undefined) {
          upsertSetting.run('processing.enableValidation', String(config.processing.enableValidation));
        }
        if (config.processing.validationRetryCount !== undefined) {
          upsertSetting.run('processing.validationRetryCount', String(config.processing.validationRetryCount));
        }
      }
    });
    transaction();
  },

  deleteSetting(key) {
    deleteSetting.run(key);
  },

  // ==================== LOGGING OPERATIONS ====================

  // AI Log operations
  createAILog(requestId, fileInfo, batchId = null) {
    const stmt = db.prepare(`
      INSERT INTO ai_logs (request_id, batch_id, file_path, file_name, file_type, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);
    stmt.run(requestId, batchId, fileInfo.filePath, fileInfo.fileName, fileInfo.fileType, fileInfo.fileSize || null);
    return requestId;
  },

  updateAILogCategorization(requestId, prompt, response, category, timeMs, model = null, reasoning = null, llmCategory = null) {
    const stmt = db.prepare(`
      UPDATE ai_logs
      SET categorization_prompt = ?, categorization_response = ?, detected_category = ?, categorization_time_ms = ?, categorization_model = ?, categorization_reasoning = ?, llm_category = ?
      WHERE request_id = ?
    `);
    stmt.run(prompt, response, category, timeMs, model, reasoning, llmCategory, requestId);
  },

  updateAILogNaming(requestId, prompt, response, suggestedName, timeMs, model = null, reasoning = null) {
    const stmt = db.prepare(`
      UPDATE ai_logs
      SET naming_prompt = ?, naming_response = ?, suggested_name = ?, naming_time_ms = ?, naming_model = ?, naming_reasoning = ?
      WHERE request_id = ?
    `);
    stmt.run(prompt, response, suggestedName, timeMs, model, reasoning, requestId);
  },

  updateAILogValidation(requestId, validationData) {
    const {
      attempts = 0,
      passed = null,
      prompt = null,
      response = null,
      reason = null,
      suggestedFix = null,
      timeMs = 0,
      model = null,
      history = null,
    } = validationData;

    const stmt = db.prepare(`
      UPDATE ai_logs
      SET validation_attempts = ?,
          validation_passed = ?,
          validation_prompt = ?,
          validation_response = ?,
          validation_reason = ?,
          validation_suggested_fix = ?,
          validation_time_ms = ?,
          validation_model = ?,
          validation_history = ?
      WHERE request_id = ?
    `);
    stmt.run(
      attempts,
      passed === true ? 1 : (passed === false ? 0 : null),
      prompt,
      response,
      reason,
      suggestedFix,
      timeMs,
      model,
      history ? JSON.stringify(history) : null,
      requestId
    );
  },

  completeAILog(requestId, status, totalTimeMs, modelUsed, errorMessage = null, errorStack = null) {
    const stmt = db.prepare(`
      UPDATE ai_logs
      SET status = ?, total_time_ms = ?, model_used = ?, error_message = ?, error_stack = ?, completed_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `);
    stmt.run(status, totalTimeMs, modelUsed, errorMessage, errorStack, requestId);
  },

  recordAILogFeedback(requestId, action, finalName = null, editDistance = null) {
    const stmt = db.prepare(`
      UPDATE ai_logs
      SET user_action = ?, final_name = ?, edit_distance = ?, feedback_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `);
    stmt.run(action, finalName, editDistance, requestId);
  },

  updateAILogRegeneration(requestId, isRegeneration, feedback = null, rejectedName = null) {
    const stmt = db.prepare(`
      UPDATE ai_logs
      SET is_regeneration = ?, regeneration_feedback = ?, rejected_name = ?
      WHERE request_id = ?
    `);
    stmt.run(isRegeneration ? 1 : 0, feedback, rejectedName, requestId);
  },

  getAILogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    let query = 'SELECT * FROM ai_logs WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.category) {
      query += ' AND detected_category = ?';
      params.push(filters.category);
    }
    if (filters.batchId) {
      query += ' AND batch_id = ?';
      params.push(filters.batchId);
    }
    if (filters.userAction) {
      query += ' AND user_action = ?';
      params.push(filters.userAction);
    }
    if (filters.isRegeneration !== undefined) {
      query += ' AND is_regeneration = ?';
      params.push(filters.isRegeneration ? 1 : 0);
    }
    if (filters.categorizationModel) {
      query += ' AND categorization_model = ?';
      params.push(filters.categorizationModel);
    }
    if (filters.namingModel) {
      query += ' AND naming_model = ?';
      params.push(filters.namingModel);
    }
    if (filters.model) {
      // Filter by either categorization or naming model
      query += ' AND (categorization_model = ? OR naming_model = ?)';
      params.push(filters.model, filters.model);
    }
    if (filters.startDate) {
      // Convert ISO date to SQLite format for comparison
      query += ' AND created_at >= datetime(?)';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND created_at <= datetime(?)';
      params.push(filters.endDate);
    }
    if (filters.search) {
      query += ' AND (file_name LIKE ? OR file_path LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT ? OFFSET ?`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  getAILogById(requestId) {
    const stmt = db.prepare('SELECT * FROM ai_logs WHERE request_id = ?');
    return stmt.get(requestId);
  },

  getAILogByFilePath(filePath) {
    const stmt = db.prepare('SELECT * FROM ai_logs WHERE file_path = ? ORDER BY created_at DESC LIMIT 1');
    return stmt.get(filePath);
  },

  getAILogsCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM ai_logs WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.category) {
      query += ' AND detected_category = ?';
      params.push(filters.category);
    }
    if (filters.startDate) {
      query += ' AND created_at >= datetime(?)';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND created_at <= datetime(?)';
      params.push(filters.endDate);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },

  // API Log operations
  createAPILog(logData) {
    const stmt = db.prepare(`
      INSERT INTO api_logs (request_id, method, endpoint, request_body, request_headers, status_code, response_body, response_time_ms, user_agent, ip_address, success, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      logData.requestId,
      logData.method,
      logData.endpoint,
      logData.requestBody,
      logData.requestHeaders,
      logData.statusCode,
      logData.responseBody,
      logData.responseTimeMs,
      logData.userAgent,
      logData.ipAddress,
      logData.success ? 1 : 0,
      logData.errorMessage
    );
    return logData.requestId;
  },

  getAPILogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    let query = 'SELECT * FROM api_logs WHERE 1=1';
    const params = [];

    if (filters.endpoint) {
      query += ' AND endpoint LIKE ?';
      params.push(`%${filters.endpoint}%`);
    }
    if (filters.method) {
      query += ' AND method = ?';
      params.push(filters.method);
    }
    if (filters.success !== undefined) {
      query += ' AND success = ?';
      params.push(filters.success ? 1 : 0);
    }
    if (filters.startDate) {
      query += ' AND created_at >= datetime(?)';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND created_at <= datetime(?)';
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT ? OFFSET ?`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  getAPILogsCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM api_logs WHERE 1=1';
    const params = [];

    if (filters.endpoint) {
      query += ' AND endpoint LIKE ?';
      params.push(`%${filters.endpoint}%`);
    }
    if (filters.method) {
      query += ' AND method = ?';
      params.push(filters.method);
    }
    if (filters.success !== undefined) {
      query += ' AND success = ?';
      params.push(filters.success ? 1 : 0);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },

  // Error Log operations
  createErrorLog(errorData) {
    const stmt = db.prepare(`
      INSERT INTO error_logs (error_id, request_id, error_type, error_code, error_message, error_stack, context, file_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      errorData.errorId,
      errorData.requestId,
      errorData.errorType,
      errorData.errorCode,
      errorData.errorMessage,
      errorData.errorStack,
      errorData.context ? JSON.stringify(errorData.context) : null,
      errorData.filePath
    );
    return errorData.errorId;
  },

  getErrorLogs(filters = {}, pagination = { page: 1, limit: 50 }) {
    let query = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];

    if (filters.errorType) {
      query += ' AND error_type = ?';
      params.push(filters.errorType);
    }
    if (filters.resolved !== undefined) {
      query += ' AND resolved = ?';
      params.push(filters.resolved ? 1 : 0);
    }
    if (filters.startDate) {
      query += ' AND created_at >= datetime(?)';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND created_at <= datetime(?)';
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';
    query += ` LIMIT ? OFFSET ?`;
    params.push(pagination.limit, (pagination.page - 1) * pagination.limit);

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  getErrorLogsCount(filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM error_logs WHERE 1=1';
    const params = [];

    if (filters.errorType) {
      query += ' AND error_type = ?';
      params.push(filters.errorType);
    }
    if (filters.resolved !== undefined) {
      query += ' AND resolved = ?';
      params.push(filters.resolved ? 1 : 0);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params).count;
  },

  resolveError(errorId, resolutionNotes) {
    const stmt = db.prepare(`
      UPDATE error_logs
      SET resolved = 1, resolution_notes = ?, resolved_at = CURRENT_TIMESTAMP
      WHERE error_id = ?
    `);
    stmt.run(resolutionNotes, errorId);
  },

  // Stats and Analytics
  getLogStats(timeRange = 'all') {
    let dateFilter = '';
    const now = new Date().toISOString();

    if (timeRange === '1h') {
      dateFilter = `AND created_at >= datetime('now', '-1 hour')`;
    } else if (timeRange === '24h') {
      dateFilter = `AND created_at >= datetime('now', '-1 day')`;
    } else if (timeRange === '7d') {
      dateFilter = `AND created_at >= datetime('now', '-7 days')`;
    } else if (timeRange === '30d') {
      dateFilter = `AND created_at >= datetime('now', '-30 days')`;
    }

    const aiStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
        AVG(total_time_ms) as avgResponseTime,
        AVG(categorization_time_ms) as avgCategorizationTime,
        AVG(naming_time_ms) as avgNamingTime
      FROM ai_logs WHERE 1=1 ${dateFilter}
    `).get();

    const errorStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved
      FROM error_logs WHERE 1=1 ${dateFilter}
    `).get();

    const apiStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        AVG(response_time_ms) as avgResponseTime
      FROM api_logs WHERE 1=1 ${dateFilter}
    `).get();

    return {
      ai: aiStats,
      errors: errorStats,
      api: apiStats,
      timeRange,
    };
  },

  // Get model usage and effectiveness statistics
  getModelStats(timeRange = 'all') {
    let dateFilter = '';
    if (timeRange === '1h') {
      dateFilter = "AND created_at >= datetime('now', '-1 hour')";
    } else if (timeRange === '24h') {
      dateFilter = "AND created_at >= datetime('now', '-1 day')";
    } else if (timeRange === '7d') {
      dateFilter = "AND created_at >= datetime('now', '-7 days')";
    } else if (timeRange === '30d') {
      dateFilter = "AND created_at >= datetime('now', '-30 days')";
    }

    // Get categorization model stats
    const categorizationStats = db.prepare(`
      SELECT
        categorization_model as model,
        COUNT(*) as total_calls,
        AVG(categorization_time_ms) as avg_time_ms
      FROM ai_logs
      WHERE categorization_model IS NOT NULL ${dateFilter}
      GROUP BY categorization_model
      ORDER BY total_calls DESC
    `).all();

    // Get naming model stats with effectiveness
    const namingStats = db.prepare(`
      SELECT
        naming_model as model,
        COUNT(*) as total_calls,
        AVG(naming_time_ms) as avg_time_ms,
        SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN user_action = 'edited' THEN 1 ELSE 0 END) as edited,
        SUM(CASE WHEN user_action = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN user_action IS NOT NULL THEN 1 ELSE 0 END) as with_feedback,
        ROUND(100.0 * SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) /
              NULLIF(SUM(CASE WHEN user_action IS NOT NULL THEN 1 ELSE 0 END), 0), 1) as acceptance_rate,
        SUM(CASE WHEN is_regeneration = 1 THEN 1 ELSE 0 END) as regenerations
      FROM ai_logs
      WHERE naming_model IS NOT NULL ${dateFilter}
      GROUP BY naming_model
      ORDER BY total_calls DESC
    `).all();

    // Get overall model usage summary
    const overallStats = db.prepare(`
      SELECT
        COUNT(DISTINCT categorization_model) as unique_categorization_models,
        COUNT(DISTINCT naming_model) as unique_naming_models,
        COUNT(*) as total_requests,
        AVG(total_time_ms) as avg_total_time_ms
      FROM ai_logs
      WHERE 1=1 ${dateFilter}
    `).get();

    return {
      categorization: categorizationStats,
      naming: namingStats,
      overall: overallStats,
    };
  },

  getPromptEffectiveness(timeRange = 'all') {
    let dateFilter = '';

    if (timeRange === '1h') {
      dateFilter = `AND created_at >= datetime('now', '-1 hour')`;
    } else if (timeRange === '24h') {
      dateFilter = `AND created_at >= datetime('now', '-1 day')`;
    } else if (timeRange === '7d') {
      dateFilter = `AND created_at >= datetime('now', '-7 days')`;
    } else if (timeRange === '30d') {
      dateFilter = `AND created_at >= datetime('now', '-30 days')`;
    }

    const stmt = db.prepare(`
      SELECT
        detected_category,
        COUNT(*) as total_suggestions,
        SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN user_action = 'edited' THEN 1 ELSE 0 END) as edited,
        SUM(CASE WHEN user_action = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN user_action = 'skipped' THEN 1 ELSE 0 END) as skipped,
        ROUND(100.0 * SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) / COUNT(*), 1) as acceptance_rate,
        AVG(CASE WHEN user_action = 'edited' THEN edit_distance ELSE NULL END) as avg_edit_distance
      FROM ai_logs
      WHERE user_action IS NOT NULL ${dateFilter}
      GROUP BY detected_category
      ORDER BY total_suggestions DESC
    `);
    return stmt.all();
  },

  getLowPerformingCategories(threshold = 50, timeRange = 'all') {
    const effectiveness = this.getPromptEffectiveness(timeRange);
    return effectiveness.filter(e => e.acceptance_rate !== null && e.acceptance_rate < threshold);
  },

  getRecentRejections(limit = 10, timeRange = 'all') {
    let dateFilter = '';
    if (timeRange === '1h') {
      dateFilter = "AND feedback_at >= datetime('now', '-1 hour')";
    } else if (timeRange === '24h') {
      dateFilter = "AND feedback_at >= datetime('now', '-1 day')";
    } else if (timeRange === '7d') {
      dateFilter = "AND feedback_at >= datetime('now', '-7 days')";
    } else if (timeRange === '30d') {
      dateFilter = "AND feedback_at >= datetime('now', '-30 days')";
    }

    const stmt = db.prepare(`
      SELECT request_id, file_name, file_path, detected_category, suggested_name, user_action, final_name, edit_distance, feedback_at, is_regeneration, regeneration_feedback, rejected_name, created_at
      FROM ai_logs
      WHERE (
        user_action IN ('rejected', 'edited')
        OR (is_regeneration = 1 AND regeneration_feedback IS NOT NULL AND regeneration_feedback != '')
      )
      ${dateFilter.replace(/feedback_at/g, 'COALESCE(feedback_at, created_at)')}
      ORDER BY COALESCE(feedback_at, created_at) DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  },

  // Get feedback details by action type with pagination
  getFeedbackDetails(actionType, timeRange = 'all', pagination = { page: 1, limit: 50 }) {
    let dateFilter = '';
    if (timeRange === '1h') {
      dateFilter = "AND feedback_at >= datetime('now', '-1 hour')";
    } else if (timeRange === '24h') {
      dateFilter = "AND feedback_at >= datetime('now', '-1 day')";
    } else if (timeRange === '7d') {
      dateFilter = "AND feedback_at >= datetime('now', '-7 days')";
    } else if (timeRange === '30d') {
      dateFilter = "AND feedback_at >= datetime('now', '-30 days')";
    }

    // Handle 'total' action type to get all feedback
    let actionFilter = '';
    if (actionType === 'total') {
      actionFilter = 'AND user_action IS NOT NULL';
    } else {
      actionFilter = 'AND user_action = ?';
    }

    const offset = (pagination.page - 1) * pagination.limit;

    const countStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM ai_logs
      WHERE 1=1 ${actionFilter} ${dateFilter}
    `);

    const dataStmt = db.prepare(`
      SELECT request_id, file_name, file_path, detected_category, suggested_name,
             user_action, final_name, edit_distance, feedback_at, created_at
      FROM ai_logs
      WHERE 1=1 ${actionFilter} ${dateFilter}
      ORDER BY feedback_at DESC
      LIMIT ? OFFSET ?
    `);

    let count, data;
    if (actionType === 'total') {
      count = countStmt.get().count;
      data = dataStmt.all(pagination.limit, offset);
    } else {
      count = countStmt.get(actionType).count;
      data = dataStmt.all(actionType, pagination.limit, offset);
    }

    return {
      items: data,
      total: count,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(count / pagination.limit),
    };
  },

  // Cleanup operations
  cleanupOldLogs(olderThanDays = 30) {
    const aiDeleted = db.prepare(`
      DELETE FROM ai_logs WHERE created_at < datetime('now', '-' || ? || ' days')
    `).run(olderThanDays);

    const apiDeleted = db.prepare(`
      DELETE FROM api_logs WHERE created_at < datetime('now', '-' || ? || ' days')
    `).run(olderThanDays);

    const errorDeleted = db.prepare(`
      DELETE FROM error_logs WHERE created_at < datetime('now', '-' || ? || ' days') AND resolved = 1
    `).run(olderThanDays);

    return {
      aiLogsDeleted: aiDeleted.changes,
      apiLogsDeleted: apiDeleted.changes,
      errorLogsDeleted: errorDeleted.changes,
    };
  },

  // Clear all logs (for manual cleanup)
  clearAllLogs() {
    const aiDeleted = db.prepare(`DELETE FROM ai_logs`).run();
    const apiDeleted = db.prepare(`DELETE FROM api_logs`).run();
    const errorDeleted = db.prepare(`DELETE FROM error_logs`).run();

    return {
      aiLogsDeleted: aiDeleted.changes,
      apiLogsDeleted: apiDeleted.changes,
      errorLogsDeleted: errorDeleted.changes,
    };
  },

  // Get regeneration statistics for effectiveness dashboard
  getRegenerationStats(timeRange = 'all') {
    let dateFilter = '';
    if (timeRange === '1h') {
      dateFilter = "AND created_at >= datetime('now', '-1 hour')";
    } else if (timeRange === '24h') {
      dateFilter = "AND created_at >= datetime('now', '-1 day')";
    } else if (timeRange === '7d') {
      dateFilter = "AND created_at >= datetime('now', '-7 days')";
    } else if (timeRange === '30d') {
      dateFilter = "AND created_at >= datetime('now', '-30 days')";
    }

    // Get overall regeneration stats
    const overallStmt = db.prepare(`
      SELECT
        COUNT(*) as total_regenerations,
        SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) as accepted_after_regen,
        SUM(CASE WHEN user_action = 'edited' THEN 1 ELSE 0 END) as edited_after_regen,
        SUM(CASE WHEN user_action = 'rejected' THEN 1 ELSE 0 END) as rejected_again,
        SUM(CASE WHEN regeneration_feedback IS NOT NULL AND regeneration_feedback != '' THEN 1 ELSE 0 END) as with_feedback
      FROM ai_logs
      WHERE is_regeneration = 1 ${dateFilter}
    `);

    // Get regeneration stats by category
    const byCategoryStmt = db.prepare(`
      SELECT
        detected_category,
        COUNT(*) as total_regenerations,
        SUM(CASE WHEN user_action = 'accepted' THEN 1 ELSE 0 END) as accepted_after_regen,
        SUM(CASE WHEN regeneration_feedback IS NOT NULL AND regeneration_feedback != '' THEN 1 ELSE 0 END) as with_feedback
      FROM ai_logs
      WHERE is_regeneration = 1 ${dateFilter}
      GROUP BY detected_category
      ORDER BY total_regenerations DESC
    `);

    // Get recent regenerations with feedback
    const recentWithFeedbackStmt = db.prepare(`
      SELECT
        request_id, file_name, detected_category, rejected_name,
        regeneration_feedback, suggested_name, user_action, created_at
      FROM ai_logs
      WHERE is_regeneration = 1
        AND regeneration_feedback IS NOT NULL
        AND regeneration_feedback != ''
        ${dateFilter}
      ORDER BY created_at DESC
      LIMIT 20
    `);

    return {
      overall: overallStmt.get(),
      byCategory: byCategoryStmt.all(),
      recentWithFeedback: recentWithFeedbackStmt.all(),
    };
  },

  // Utility
  close() {
    db.close();
  },
};

export default dbOperations;

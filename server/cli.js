#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { resolve, basename } from 'path';
import { promises as fs } from 'fs';

import { organizeFile, organizeDirectory, getHistory, undoRename } from './core/organizer.js';
import { createWatcher } from './core/watcher.js';
import { testConnection } from './ai/ollama.js';
import { loadConfig } from './config/default.js';
import { isSupported, fileExists, getFileStats } from './utils/fileUtils.js';
import logger from './utils/logger.js';

const config = loadConfig();
const program = new Command();

program
  .name('genorganize')
  .description('AI-powered local file organizer using Ollama')
  .version('1.0.0');

program
  .command('process <path>')
  .description('Process a file or directory')
  .option('-r, --recursive', 'Process directories recursively', false)
  .option('-d, --dry-run', 'Preview changes without applying', false)
  .option('-m, --move', 'Move files to organized folders', false)
  .option('--skip-audio', 'Skip audio files', false)
  .option('--skip-video', 'Skip video files', false)
  .option('--audio-mode <mode>', 'Audio processing mode (metadata|transcribe)', 'metadata')
  .option('--video-mode <mode>', 'Video processing mode (metadata|keyframes|transcribe)', 'keyframes')
  .action(async (path, options) => {
    const spinner = ora('Initializing...').start();

    try {
      const fullPath = resolve(path);
      const stats = await fs.stat(fullPath);

      if (options.skipAudio) config.processing.skipAudio = true;
      if (options.skipVideo) config.processing.skipVideo = true;
      if (options.audioMode) config.processing.audioMode = options.audioMode;
      if (options.videoMode) config.processing.videoMode = options.videoMode;

      if (stats.isFile()) {
        spinner.text = `Processing: ${basename(fullPath)}`;

        const result = await organizeFile(fullPath, {
          dryRun: options.dryRun,
          autoMove: options.move,
        });

        spinner.stop();
        printResult(result, options.dryRun);
      } else if (stats.isDirectory()) {
        spinner.text = 'Scanning directory...';

        const result = await organizeDirectory(fullPath, {
          recursive: options.recursive,
          dryRun: options.dryRun,
          autoMove: options.move,
          onProgress: (progress) => {
            spinner.text = `Processing ${progress.current}/${progress.total}: ${basename(progress.result.filePath || '')}`;
          },
        });

        spinner.stop();
        printSummary(result.summary, options.dryRun);

        if (result.results.length > 0) {
          console.log('\n' + chalk.bold('Results:'));
          for (const r of result.results.slice(0, 20)) {
            printResult(r, options.dryRun, true);
          }
          if (result.results.length > 20) {
            console.log(chalk.gray(`  ... and ${result.results.length - 20} more`));
          }
        }
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('watch [directories...]')
  .description('Watch directories for new files')
  .option('-d, --dry-run', 'Preview changes without applying', false)
  .option('-m, --move', 'Move files to organized folders', false)
  .option('-p, --processed <folder>', 'Move processed files to this folder')
  .action(async (directories, options) => {
    const watchDirs = directories.length > 0 ? directories.map(resolve) : config.watch.directories;

    if (watchDirs.length === 0) {
      console.log(chalk.red('Error: No directories specified. Use: genorganize watch <dir1> <dir2> ...'));
      process.exit(1);
    }

    console.log(chalk.bold('\n📁 GenAI File Organizer Watch Mode\n'));
    console.log(chalk.gray('Watching directories:'));
    watchDirs.forEach((dir) => console.log(chalk.cyan(`  • ${dir}`)));
    console.log(chalk.gray('\nPress Ctrl+C to stop\n'));

    const watcher = createWatcher({
      directories: watchDirs,
      dryRun: options.dryRun,
      autoMove: options.move,
      processedFolder: options.processed,
    });

    watcher.on('ready', () => {
      console.log(chalk.green('✓ Watcher ready'));
    });

    watcher.on('fileDetected', ({ fileName }) => {
      console.log(chalk.yellow(`📄 New file: ${fileName}`));
    });

    watcher.on('processingComplete', ({ result }) => {
      if (result.dryRun) {
        console.log(chalk.blue(`  [DRY RUN] ${result.originalName} → ${result.suggestedName}`));
      } else {
        console.log(chalk.green(`  ✓ ${result.originalName} → ${result.suggestedName}`));
      }
    });

    watcher.on('processingFailed', ({ fileName, error }) => {
      console.log(chalk.red(`  ✗ ${fileName}: ${error}`));
    });

    watcher.on('error', (error) => {
      console.log(chalk.red(`Error: ${error.message}`));
    });

    watcher.start();

    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nStopping watcher...'));
      watcher.stop();
      process.exit(0);
    });
  });

program
  .command('history')
  .description('Show processing history')
  .option('-n, --limit <number>', 'Number of entries to show', '20')
  .option('-a, --all', 'Include undone entries', false)
  .action((options) => {
    const history = getHistory({
      limit: parseInt(options.limit),
      includeUndone: options.all,
    });

    if (history.length === 0) {
      console.log(chalk.gray('No history entries found'));
      return;
    }

    console.log(chalk.bold('\n📜 Processing History\n'));

    for (const entry of history) {
      const status = entry.undone
        ? chalk.yellow('[UNDONE]')
        : entry.dryRun
        ? chalk.blue('[DRY RUN]')
        : chalk.green('[APPLIED]');

      console.log(`${status} ${entry.originalName} → ${entry.suggestedName}`);
      console.log(chalk.gray(`   ${entry.timestamp} | ID: ${entry.id.slice(0, 8)}`));
    }
  });

program
  .command('undo <historyId>')
  .description('Undo a rename operation')
  .action(async (historyId) => {
    const spinner = ora('Undoing rename...').start();

    try {
      const result = await undoRename(historyId);
      spinner.succeed(chalk.green(`Restored: ${basename(result.originalPath)}`));
    } catch (error) {
      spinner.fail(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Check system configuration and dependencies')
  .action(async () => {
    console.log(chalk.bold('\n🔍 GenAI File Organizer System Check\n'));

    console.log(chalk.gray('Checking Ollama connection...'));
    const ollamaResult = await testConnection();

    if (ollamaResult.success) {
      console.log(chalk.green(`✓ Ollama connected at ${config.ollama.host}`));
      console.log(chalk.gray(`  Models: ${ollamaResult.models.map((m) => m.name).join(', ')}`));

      const hasModel = ollamaResult.models.some((m) =>
        m.name.includes(config.ollama.model.split(':')[0])
      );
      if (hasModel) {
        console.log(chalk.green(`✓ Model ${config.ollama.model} available`));
      } else {
        console.log(chalk.yellow(`⚠ Model ${config.ollama.model} not found`));
        console.log(chalk.gray(`  Run: ollama pull ${config.ollama.model}`));
      }
    } else {
      console.log(chalk.red(`✗ Ollama connection failed: ${ollamaResult.error}`));
      console.log(chalk.gray('  Make sure Ollama is running: ollama serve'));
    }

    console.log(chalk.gray('\nChecking ffmpeg...'));
    try {
      const { execSync } = await import('child_process');
      execSync('ffmpeg -version', { stdio: 'pipe' });
      console.log(chalk.green('✓ ffmpeg installed'));
    } catch {
      console.log(chalk.yellow('⚠ ffmpeg not found (required for video processing)'));
      console.log(chalk.gray('  Install: brew install ffmpeg'));
    }

    console.log(chalk.gray('\nConfiguration:'));
    console.log(chalk.gray(`  Model: ${config.ollama.model}`));
    console.log(chalk.gray(`  Batch size: ${config.processing.batchSize}`));
    console.log(chalk.gray(`  Skip audio: ${config.processing.skipAudio}`));
    console.log(chalk.gray(`  Skip video: ${config.processing.skipVideo}`));

    console.log(chalk.bold('\n✓ System check complete\n'));
  });

program
  .command('config')
  .description('Manage configuration')
  .option('--init', 'Create default config file')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    if (options.init) {
      const configPath = resolve('genorganize.config.json');

      if (await fileExists(configPath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: 'Config file already exists. Overwrite?',
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log(chalk.yellow('Cancelled'));
          return;
        }
      }

      const defaultConfig = {
        ollama: {
          host: 'http://localhost:11434',
          model: 'qwen2-vl:8b',
        },
        processing: {
          skipAudio: false,
          skipVideo: false,
          audioMode: 'metadata',
          videoMode: 'keyframes',
        },
        folders: {
          enabled: false,
          rules: [
            { type: 'invoice', destination: './Invoices' },
            { type: 'screenshot', destination: './Screenshots' },
          ],
        },
        watch: {
          directories: [],
        },
      };

      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(chalk.green(`✓ Created ${configPath}`));
    }

    if (options.show) {
      console.log(chalk.bold('\nCurrent Configuration:\n'));
      console.log(JSON.stringify(config, null, 2));
    }
  });

function printResult(result, dryRun = false, compact = false) {
  if (result.skipped) {
    if (!compact) console.log(chalk.gray(`⏭ Skipped: ${result.reason}`));
    return;
  }

  if (!result.success) {
    console.log(chalk.red(`✗ ${result.originalName || result.fileName}: ${result.error}`));
    return;
  }

  const prefix = dryRun ? chalk.blue('[DRY RUN]') : chalk.green('✓');
  const arrow = chalk.gray('→');

  if (compact) {
    console.log(`  ${prefix} ${result.originalName} ${arrow} ${result.suggestedName}`);
  } else {
    console.log(`\n${prefix} Rename suggestion:`);
    console.log(`  ${chalk.red(result.originalName)}`);
    console.log(`  ${arrow}`);
    console.log(`  ${chalk.green(result.suggestedName)}`);

    if (result.category) {
      console.log(chalk.gray(`  Category: ${result.category}`));
    }

    if (result.processingTime) {
      console.log(chalk.gray(`  Time: ${result.processingTime}ms`));
    }
  }
}

function printSummary(summary, dryRun = false) {
  console.log(chalk.bold('\n📊 Summary\n'));

  const mode = dryRun ? chalk.blue('[DRY RUN]') : '';
  console.log(`  Total files: ${summary.total} ${mode}`);
  console.log(chalk.green(`  Successful: ${summary.successful || summary.dryRun || 0}`));
  console.log(chalk.red(`  Failed: ${summary.failed}`));

  if (summary.skipped > 0) {
    console.log(chalk.gray(`  Skipped: ${summary.skipped}`));
  }
}

program.parse();

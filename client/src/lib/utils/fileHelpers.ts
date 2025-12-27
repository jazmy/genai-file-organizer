import {
  Folder,
  File,
  FileText,
  Image,
  Music,
  Video,
  Code,
  Archive,
  type LucideIcon,
} from 'lucide-react';
import type { FileItem, SortConfig } from '@/types/files';

export function getFileIcon(file: FileItem): LucideIcon {
  if (file.isDirectory) return Folder;

  const name = file.name.toLowerCase();

  if (['.pdf', '.doc', '.docx', '.txt', '.rtf', '.md'].some((e) => name.endsWith(e))) {
    return FileText;
  }
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.avif', '.svg', '.bmp', '.tiff'].some((e) => name.endsWith(e))) {
    return Image;
  }
  if (['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg'].some((e) => name.endsWith(e))) {
    return Music;
  }
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].some((e) => name.endsWith(e))) {
    return Video;
  }
  if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.go', '.rs'].some((e) => name.endsWith(e))) {
    return Code;
  }
  if (['.zip', '.tar', '.gz', '.rar', '.7z'].some((e) => name.endsWith(e))) {
    return Archive;
  }

  return File;
}

export function isImageFile(fileName: string): boolean {
  // Include file types that have server-side preview generation
  return [
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.avif', '.svg', '.bmp', '.tiff',
    '.psd',  // PSD - converted to PNG
    '.pdf',  // PDF - first page rendered as PNG
    '.ai',   // Adobe Illustrator - PDF-based, rendered via pdftoppm
    '.docx', '.doc',  // Word docs - rendered via LibreOffice/Puppeteer
    '.xlsx', '.xls',  // Excel - rendered via LibreOffice
    '.txt', '.md',    // Text files - rendered via Puppeteer
    '.csv',  // CSV - rendered as table via Puppeteer
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v',  // Video - frame capture via ffmpeg
  ].some((ext) => fileName.toLowerCase().endsWith(ext));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export function sortFiles(files: FileItem[], config: SortConfig): FileItem[] {
  const sorted = [...files];

  sorted.sort((a, b) => {
    // Directories always come first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let comparison = 0;

    switch (config.field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'modified':
        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
      case 'type':
        comparison = getFileExtension(a.name).localeCompare(getFileExtension(b.name));
        break;
    }

    return config.direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

export function groupFilesByStatus(
  files: FileItem[],
  results: Map<string, { success: boolean }>,
  completedFiles: Set<string>,
  processingFiles?: Set<string>
) {
  const directories = files.filter((f) => f.isDirectory);
  // Processing: files that are being processed (including regenerating files with existing results)
  const processing = files.filter(
    (f) => !f.isDirectory && processingFiles?.has(f.path)
  );
  // Pending Approval: files with successful results that are NOT currently being regenerated
  const readyToApply = files.filter(
    (f) => !f.isDirectory && results.has(f.path) && results.get(f.path)?.success && !processingFiles?.has(f.path)
  );
  // Failed: files with failed results that are NOT being reprocessed
  const failed = files.filter(
    (f) => !f.isDirectory && results.has(f.path) && !results.get(f.path)?.success && !processingFiles?.has(f.path)
  );
  const completed = files.filter(
    (f) => !f.isDirectory && completedFiles.has(f.path) && !results.has(f.path) && !processingFiles?.has(f.path)
  );
  const unprocessed = files.filter(
    (f) => !f.isDirectory && !results.has(f.path) && !completedFiles.has(f.path) && !processingFiles?.has(f.path)
  );

  return { directories, processing, readyToApply, failed, completed, unprocessed };
}

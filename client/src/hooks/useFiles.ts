'use client';

import { useCallback } from 'react';
import { useFileStore } from '@/stores/fileStore';
import { useUIStore } from '@/stores/uiStore';
import { deleteFile as apiDeleteFile, applyChanges } from '@/lib/api/files';

export function useFiles() {
  const { markComplete, removeFile, selectedFiles, clearSelection } = useFileStore();
  const { addToast } = useUIStore();

  const deleteFile = useCallback(
    async (filePath: string) => {
      try {
        await apiDeleteFile(filePath);
        // Remove from local state instead of reloading all files
        // This preserves scroll position
        removeFile(filePath);

        addToast({
          type: 'success',
          title: 'File Deleted',
          message: filePath.split('/').pop() || 'File',
          duration: 3000,
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Delete Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [removeFile, addToast]
  );

  // Direct rename - renames file immediately without AI processing
  const directRename = useCallback(
    async (filePath: string, newName: string) => {
      try {
        await applyChanges([{ filePath, suggestedName: newName }]);
        
        // Compute the new path after renaming
        const dir = filePath.substring(0, filePath.lastIndexOf('/'));
        const newPath = `${dir}/${newName}`;
        
        // Mark as complete with the new path (preserves scroll position)
        markComplete(newPath);
        // Remove the old file entry
        removeFile(filePath);

        addToast({
          type: 'success',
          title: 'File Renamed',
          message: newName,
          duration: 3000,
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Rename Failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [markComplete, removeFile, addToast]
  );

  // Bulk delete - deletes all selected files
  const deleteSelected = useCallback(async () => {
    const filesToDelete = Array.from(selectedFiles);
    if (filesToDelete.length === 0) return;

    let successCount = 0;
    let errorCount = 0;

    for (const filePath of filesToDelete) {
      try {
        await apiDeleteFile(filePath);
        removeFile(filePath);
        successCount++;
      } catch (err) {
        errorCount++;
      }
    }

    clearSelection();

    if (successCount > 0) {
      addToast({
        type: 'success',
        title: 'Files Deleted',
        message: `${successCount} file${successCount > 1 ? 's' : ''} deleted${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        duration: 3000,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete files',
      });
    }
  }, [selectedFiles, removeFile, clearSelection, addToast]);

  return {
    deleteFile,
    directRename,
    deleteSelected,
  };
}

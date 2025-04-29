import fs from 'fs';
import path from 'path';

// Function to get file stats with creation time
interface FileInfo {
  path: string;
  name: string;
  createdAt: Date;
  size: number;
}

/**
 * Get information about files in a directory
 * @param dir Directory to scan
 * @param filter Optional file extension filter
 * @returns Array of FileInfo objects
 */
export function getFileStats(dir: string, filter?: string[]): FileInfo[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const fileNames = fs.readdirSync(dir);
  const fileInfos: FileInfo[] = [];

  for (const fileName of fileNames) {
    // Skip hidden files
    if (fileName.startsWith('.')) continue;
    
    // Apply extension filter if provided
    if (filter && filter.length > 0) {
      const ext = path.extname(fileName).toLowerCase();
      if (!filter.includes(ext)) continue;
    }

    const filePath = path.join(dir, fileName);
    const stats = fs.statSync(filePath);

    if (stats.isFile()) {
      fileInfos.push({
        path: filePath,
        name: fileName,
        createdAt: stats.birthtime,
        size: stats.size
      });
    }
  }

  return fileInfos;
}

/**
 * Delete a file
 * @param filePath Path to the file to delete
 * @returns True if deletion was successful
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
}

/**
 * Clean up old files, keeping only the specified number of newest files
 * @param dir Directory to clean
 * @param keepCount Number of newest files to keep
 * @param filter Optional file extension filter
 * @returns Number of deleted files
 */
export function cleanupOldFiles(dir: string, keepCount: number, filter?: string[]): number {
  const files = getFileStats(dir, filter);
  
  // Sort files by creation time (newest first)
  files.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  // Keep the newest files, delete the rest
  const filesToDelete = files.slice(keepCount);
  let deletedCount = 0;
  
  for (const file of filesToDelete) {
    if (deleteFile(file.path)) {
      deletedCount++;
    }
  }
  
  return deletedCount;
}

/**
 * Get formatted file size in KB, MB, etc.
 * @param bytes Size in bytes
 * @returns Formatted string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  else return (bytes / 1073741824).toFixed(1) + ' GB';
}
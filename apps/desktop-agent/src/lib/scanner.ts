import * as fs from 'fs';
import * as path from 'path';

export interface ScanProgress {
  status: 'scanning' | 'uploading' | 'completed' | 'failed';
  totalFiles: number;
  parsedSongs: number;
  processedSongs: number;
  errorMessage?: string;
}

export interface SongMetadata {
  artist: string;
  title: string;
  brand?: string;
}

/**
 * Recursively scans directory for .zip, .mp3, .cdg files and returns their full paths
 */
async function getFilesRecursively(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await getFilesRecursively(fullPath);
      files.push(...nestedFiles);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      // Karaoke files are typically zipped, or mp3+cdg pairs
      if (ext === '.zip' || ext === '.mp3' || ext === '.cdg') {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Parses a filename like "[Artist] - [Title] [Brand].zip" or "[Artist] - [Title].zip"
 */
export function parseFilename(filename: string): SongMetadata | null {
  // Remove file extension
  const ext = path.extname(filename);
  const nameWithoutExt = filename.substring(0, filename.length - ext.length).trim();

  // Split by first " - " to separate Artist and Title
  const splitIndex = nameWithoutExt.indexOf(' - ');
  if (splitIndex === -1) {
    // If no dash is present, fallback to using the name as Title, and empty Artist
    return {
      artist: 'Unknown Artist',
      title: nameWithoutExt,
    };
  }

  const artist = nameWithoutExt.substring(0, splitIndex).trim();
  const titleAndBrand = nameWithoutExt.substring(splitIndex + 3).trim();

  // Match brackets or parentheses at the end of the title (e.g. "[OKJ]" or "(SC)")
  const brandRegex = /\s*[\[\(]([^\]\)]+)[\]\)]\s*$/;
  const match = titleAndBrand.match(brandRegex);

  if (match) {
    const brand = match[1]?.trim() || '';
    const title = titleAndBrand.replace(brandRegex, '').trim();
    return {
      artist: artist || 'Unknown Artist',
      title: title || 'Unknown Title',
      brand: brand,
    };
  }

  return {
    artist: artist || 'Unknown Artist',
    title: titleAndBrand || 'Unknown Title',
  };
}

/**
 * Core scanning and synchronizing worker function
 */
export async function scanAndSync(
  directoryPath: string,
  apiUrl: string,
  apiKey: string,
  systemNumber: number,
  onProgress: (progress: ScanProgress) => void
): Promise<void> {
  try {
    onProgress({ status: 'scanning', totalFiles: 0, parsedSongs: 0, processedSongs: 0 });

    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory does not exist: ${directoryPath}`);
    }

    // 1. Gather all files recursively
    const files = await getFilesRecursively(directoryPath);
    onProgress({ status: 'scanning', totalFiles: files.length, parsedSongs: 0, processedSongs: 0 });

    // 2. Parse filenames into metadata objects, de-duplicating by artist + title
    const uniqueSongs = new Map<string, SongMetadata>();
    
    for (const filePath of files) {
      const filename = path.basename(filePath);
      const ext = path.extname(filename).toLowerCase();

      // Avoid double-counting mp3/cdg pairs (e.g. Queen - Bohemian.mp3 and Queen - Bohemian.cdg)
      if (ext === '.cdg') {
        const mp3Companion = filePath.substring(0, filePath.length - ext.length) + '.mp3';
        if (fs.existsSync(mp3Companion)) {
          continue; // Count the mp3 file, ignore the cdg companion
        }
      }

      const song = parseFilename(filename);
      if (song) {
        const key = `${song.artist.toLowerCase()}:::${song.title.toLowerCase()}`;
        uniqueSongs.set(key, song);
      }
    }

    const songList = Array.from(uniqueSongs.values());
    onProgress({
      status: 'uploading',
      totalFiles: files.length,
      parsedSongs: songList.length,
      processedSongs: 0,
    });

    const endpoint = `${apiUrl}/api/v1/legacy/okj/api.php`;

    // 3. Clear database on legacy API
    const clearResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: 'clearDatabase',
        api_key: apiKey,
        system_id: systemNumber,
      }),
    });

    const clearResult = (await clearResponse.json()) as any;
    if (clearResult.error) {
      throw new Error(`Failed to clear database: ${clearResult.errorString}`);
    }

    // 4. Batch uploads in chunks of 1,000 songs
    const CHUNK_SIZE = 1000;
    let uploadedCount = 0;

    for (let i = 0; i < songList.length; i += CHUNK_SIZE) {
      const chunk = songList.slice(i, i + CHUNK_SIZE);
      
      const addResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'addSongs',
          api_key: apiKey,
          system_id: systemNumber,
          songs: chunk,
        }),
      });

      const addResult = (await addResponse.json()) as any;
      if (addResult.error) {
        throw new Error(`Failed uploading song batch: ${addResult.errorString}`);
      }

      uploadedCount += chunk.length;
      onProgress({
        status: 'uploading',
        totalFiles: files.length,
        parsedSongs: songList.length,
        processedSongs: uploadedCount,
      });
    }

    onProgress({
      status: 'completed',
      totalFiles: files.length,
      parsedSongs: songList.length,
      processedSongs: songList.length,
    });
  } catch (error: any) {
    onProgress({
      status: 'failed',
      totalFiles: 0,
      parsedSongs: 0,
      processedSongs: 0,
      errorMessage: error.message || String(error),
    });
  }
}

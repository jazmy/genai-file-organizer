import * as musicMetadata from 'music-metadata';
import { readBinaryFile } from '../utils/fileUtils.js';
import logger from '../utils/logger.js';

export async function extractAudio(filePath, options = {}) {
  const { mode = 'metadata' } = options;

  logger.debug(`Extracting audio from: ${filePath} (mode: ${mode})`);

  try {
    const buffer = await readBinaryFile(filePath);
    const metadata = await musicMetadata.parseBuffer(buffer);

    const { common, format } = metadata;

    const audioMetadata = {
      title: common.title || null,
      artist: common.artist || null,
      album: common.album || null,
      year: common.year || null,
      genre: common.genre?.[0] || null,
      track: common.track?.no || null,
      duration: format.duration ? formatDuration(format.duration) : null,
      durationSeconds: format.duration || null,
      bitrate: format.bitrate || null,
      sampleRate: format.sampleRate || null,
      channels: format.numberOfChannels || null,
      codec: format.codec || null,
    };

    let content = buildAudioDescription(audioMetadata);

    return {
      content,
      metadata: audioMetadata,
      needsTranscription: mode === 'transcribe' && !audioMetadata.title,
    };
  } catch (error) {
    logger.error(`Audio extraction failed: ${error.message}`);
    return {
      content: '',
      metadata: {},
      error: error.message,
    };
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function buildAudioDescription(metadata) {
  const parts = [];

  if (metadata.title) parts.push(`Title: ${metadata.title}`);
  if (metadata.artist) parts.push(`Artist: ${metadata.artist}`);
  if (metadata.album) parts.push(`Album: ${metadata.album}`);
  if (metadata.year) parts.push(`Year: ${metadata.year}`);
  if (metadata.genre) parts.push(`Genre: ${metadata.genre}`);
  if (metadata.duration) parts.push(`Duration: ${metadata.duration}`);

  return parts.join('\n') || 'No metadata available';
}

export default extractAudio;

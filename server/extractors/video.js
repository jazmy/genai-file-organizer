import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function extractVideo(filePath, options = {}) {
  const { mode = 'keyframes', keyframeCount = 3 } = options;

  logger.debug(`Extracting video from: ${filePath} (mode: ${mode})`);

  try {
    const metadata = await getVideoMetadata(filePath);

    if (mode === 'metadata') {
      return {
        content: buildVideoDescription(metadata),
        metadata,
        needsVision: false,
      };
    }

    const keyframes = await extractKeyframes(filePath, keyframeCount, metadata.duration);

    return {
      content: buildVideoDescription(metadata),
      metadata,
      keyframes,
      needsVision: true,
    };
  } catch (error) {
    logger.error(`Video extraction failed: ${error.message}`);
    return {
      content: '',
      metadata: {},
      error: error.message,
    };
  }
}

async function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find((s) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s) => s.codec_type === 'audio');

        resolve({
          duration: parseFloat(data.format?.duration) || null,
          durationFormatted: formatDuration(parseFloat(data.format?.duration)),
          bitrate: parseInt(data.format?.bit_rate) || null,
          size: parseInt(data.format?.size) || null,
          format: data.format?.format_name || null,
          width: videoStream?.width || null,
          height: videoStream?.height || null,
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : null,
          fps: videoStream?.r_frame_rate || null,
          videoCodec: videoStream?.codec_name || null,
          audioCodec: audioStream?.codec_name || null,
          creationDate: data.format?.tags?.creation_time || null,
          title: data.format?.tags?.title || null,
        });
      } catch (e) {
        reject(new Error(`Failed to parse ffprobe output: ${e.message}`));
      }
    });

    ffprobe.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('ffprobe not found. Please install ffmpeg.'));
      } else {
        reject(err);
      }
    });
  });
}

async function extractKeyframes(filePath, count, duration) {
  const tempDir = join(tmpdir(), `genorganize-${uuidv4()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const keyframes = [];

  try {
    const timestamps = [];
    if (duration) {
      for (let i = 0; i < count; i++) {
        timestamps.push((duration / (count + 1)) * (i + 1));
      }
    } else {
      timestamps.push(0, 5, 10);
    }

    for (let i = 0; i < timestamps.length; i++) {
      const outputPath = join(tempDir, `frame_${i}.jpg`);

      await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
          '-ss', timestamps[i].toString(),
          '-i', filePath,
          '-vframes', '1',
          '-q:v', '2',
          '-y',
          outputPath,
        ]);

        ffmpeg.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`ffmpeg exited with code ${code}`));
        });

        ffmpeg.on('error', reject);
      });

      try {
        const frameBuffer = await fs.readFile(outputPath);
        const resized = await sharp(frameBuffer)
          .resize(1024, 1024, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer();

        keyframes.push({
          timestamp: timestamps[i],
          base64: resized.toString('base64'),
        });
      } catch (e) {
        logger.warn(`Failed to process keyframe at ${timestamps[i]}s: ${e.message}`);
      }
    }

    await fs.rm(tempDir, { recursive: true, force: true });

    return keyframes;
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function buildVideoDescription(metadata) {
  const parts = [];

  if (metadata.title) parts.push(`Title: ${metadata.title}`);
  if (metadata.durationFormatted) parts.push(`Duration: ${metadata.durationFormatted}`);
  if (metadata.resolution) parts.push(`Resolution: ${metadata.resolution}`);
  if (metadata.videoCodec) parts.push(`Video Codec: ${metadata.videoCodec}`);
  if (metadata.creationDate) parts.push(`Created: ${metadata.creationDate}`);

  return parts.join('\n') || 'No metadata available';
}

export default extractVideo;

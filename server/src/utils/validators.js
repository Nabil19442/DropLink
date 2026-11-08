/**
 * Input and payload validators for DropLink signaling server
 */

const ROOM_ID_REGEX = /^[a-zA-Z0-9_-]{6,32}$/;

export function isValidRoomId(roomId) {
  return typeof roomId === 'string' && ROOM_ID_REGEX.test(roomId);
}

export function isValidDeviceInfo(device) {
  if (!device || typeof device !== 'object') return false;
  return (
    typeof device.browser === 'string' &&
    typeof device.os === 'string' &&
    typeof device.type === 'string'
  );
}

export function isValidFileMetadata(files, maxFiles = 50, maxTotalBytes = 5 * 1024 * 1024 * 1024) {
  if (!Array.isArray(files) || files.length === 0 || files.length > maxFiles) {
    return { valid: false, reason: `Files count must be between 1 and ${maxFiles}` };
  }

  let totalSize = 0;
  for (const file of files) {
    if (!file || typeof file !== 'object') {
      return { valid: false, reason: 'Invalid file object' };
    }
    if (typeof file.name !== 'string' || file.name.trim().length === 0 || file.name.length > 255) {
      return { valid: false, reason: 'Invalid file name' };
    }
    if (typeof file.size !== 'number' || file.size < 0 || isNaN(file.size)) {
      return { valid: false, reason: 'Invalid file size' };
    }
    totalSize += file.size;
  }

  if (totalSize > maxTotalBytes) {
    return { valid: false, reason: `Total transfer size exceeds limit (${maxTotalBytes} bytes)` };
  }

  return { valid: true, totalSize };
}

export function isValidSdp(sdp) {
  return (
    sdp &&
    typeof sdp === 'object' &&
    (sdp.type === 'offer' || sdp.type === 'answer' || sdp.type === 'pranswer') &&
    typeof sdp.sdp === 'string' &&
    sdp.sdp.length > 0 &&
    sdp.sdp.length < 50000
  );
}

export function isValidIceCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  return typeof candidate.candidate === 'string' || candidate.candidate === '';
}


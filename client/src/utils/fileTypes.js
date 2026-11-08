/**
 * File type categories and extensions helper
 */

export function getFileCategory(filename = '', mimeType = '') {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) {
    return 'image';
  }
  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv'].includes(ext)) {
    return 'video';
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) {
    return 'audio';
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (
    ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) ||
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('compressed')
  ) {
    return 'archive';
  }
  if (
    ['doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md'].includes(ext) ||
    mimeType.includes('word') ||
    mimeType.includes('text')
  ) {
    return 'document';
  }
  if (
    ['xls', 'xlsx', 'csv'].includes(ext) ||
    mimeType.includes('sheet') ||
    mimeType.includes('excel')
  ) {
    return 'spreadsheet';
  }
  if (
    ['ppt', 'pptx'].includes(ext) ||
    mimeType.includes('presentation') ||
    mimeType.includes('powerpoint')
  ) {
    return 'presentation';
  }
  if (
    ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'c', 'cpp', 'rs', 'go', 'php', 'java', 'sql'].includes(ext)
  ) {
    return 'code';
  }

  return 'generic';
}

export function getCategoryBadgeStyle(category) {
  switch (category) {
    case 'image':
      return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' };
    case 'video':
      return { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' };
    case 'audio':
      return { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' };
    case 'pdf':
      return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' };
    case 'archive':
      return { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' };
    case 'document':
      return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
    case 'spreadsheet':
      return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' };
    case 'presentation':
      return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' };
    case 'code':
      return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' };
    default:
      return { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400' };
  }
}


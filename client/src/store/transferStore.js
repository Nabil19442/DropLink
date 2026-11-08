import { create } from 'zustand';

export const useTransferStore = create((set, get) => ({
  // App & Room State
  role: null, // 'sender' | 'receiver' | null
  roomId: null,
  roomUrl: '',
  expiresAt: null,
  status: 'idle', // 'idle' | 'creating' | 'waiting' | 'paired' | 'requesting' | 'prompting' | 'connecting' | 'transferring' | 'completed' | 'cancelled' | 'failed' | 'disconnected'
  errorMessage: '',

  // Peer Information
  peerDevice: null,

  // Sender Files (actual browser File objects)
  selectedFiles: [],

  // Receiver Metadata & Reconstructed files
  incomingFilesMeta: [],
  receivedFiles: [], // Array of { id, name, size, type, blob, url }

  // Transfer Metrics
  totalBytes: 0,
  transferredBytes: 0,
  currentSpeed: 0,
  estimatedSecondsRemaining: 0,
  currentFileIndex: 0,
  currentFileName: '',
  currentFileBytes: 0,
  currentFileTotalBytes: 0,
  fileProgress: {}, // { [name]: { bytes, total, percent } }

  // Toasts
  toasts: [],

  // Actions
  setRole: (role) => set({ role }),
  setRoom: ({ roomId, roomUrl, expiresAt }) => set({ roomId, roomUrl, expiresAt }),
  setStatus: (status, errorMessage = '') => set({ status, errorMessage }),
  setPeerDevice: (peerDevice) => set({ peerDevice }),

  // File selection
  addFiles: (newFiles) => {
    const existing = get().selectedFiles;
    // Filter duplicates by name & size
    const toAdd = Array.from(newFiles).filter(
      nf => !existing.some(ef => ef.name === nf.name && ef.size === nf.size)
    );
    const combined = [...existing, ...toAdd];
    const totalSize = combined.reduce((acc, f) => acc + f.size, 0);
    set({ selectedFiles: combined, totalBytes: totalSize, role: 'sender' });
  },

  removeFile: (fileName) => {
    const updated = get().selectedFiles.filter(f => f.name !== fileName);
    const totalSize = updated.reduce((acc, f) => acc + f.size, 0);
    set({
      selectedFiles: updated,
      totalBytes: totalSize,
      role: updated.length > 0 ? 'sender' : null
    });
  },

  clearFiles: () => {
    set({ selectedFiles: [], totalBytes: 0, role: null });
  },

  setIncomingFiles: (files, totalBytes) => {
    set({
      incomingFilesMeta: files,
      totalBytes: totalBytes || files.reduce((acc, f) => acc + f.size, 0)
    });
  },

  addReceivedFile: (fileItem) => {
    set((state) => ({
      receivedFiles: [...state.receivedFiles, fileItem]
    }));
  },

  // Progress update
  updateProgress: (metrics) => {
    set((state) => ({
      ...state,
      ...metrics,
      fileProgress: {
        ...state.fileProgress,
        ...(metrics.fileProgress || {})
      }
    }));
  },

  resetTransfer: () => {
    // Revoke old object URLs
    const { receivedFiles } = get();
    receivedFiles.forEach(f => {
      if (f.url) URL.revokeObjectURL(f.url);
    });

    set({
      role: null,
      roomId: null,
      roomUrl: '',
      expiresAt: null,
      status: 'idle',
      errorMessage: '',
      peerDevice: null,
      selectedFiles: [],
      incomingFilesMeta: [],
      receivedFiles: [],
      totalBytes: 0,
      transferredBytes: 0,
      currentSpeed: 0,
      estimatedSecondsRemaining: 0,
      currentFileIndex: 0,
      currentFileName: '',
      currentFileBytes: 0,
      currentFileTotalBytes: 0,
      fileProgress: {}
    });
  },

  // Toasts
  addToast: ({ type = 'info', title, message, duration = 4000 }) => {
    const id = Math.random().toString(36).substring(2, 9);
    set(state => ({
      toasts: [...state.toasts, { id, type, title, message }]
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  }
}));


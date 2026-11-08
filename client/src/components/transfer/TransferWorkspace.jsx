import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Share2, AlertCircle, RefreshCw, KeyRound, ArrowRight, UploadCloud, X } from 'lucide-react';
import { useFileTransfer } from '../../hooks/useFileTransfer.js';
import { FileSelector } from './FileSelector.jsx';
import { FileList } from './FileList.jsx';
import { LinkSharingCard } from './LinkSharingCard.jsx';
import { ConnectionStatusBadge } from './ConnectionStatusBadge.jsx';
import { ReceiverConsentModal } from './ReceiverConsentModal.jsx';
import { TransferProgressCard } from './TransferProgressCard.jsx';
import { TransferSuccessView } from './TransferSuccessView.jsx';
import { Button } from '../ui/Button.jsx';
import { GlassCard } from '../ui/GlassCard.jsx';
import { sounds } from '../../utils/soundEffects.js';

export function TransferWorkspace() {
  const {
    role,
    roomId,
    roomUrl,
    expiresAt,
    status,
    errorMessage,
    peerDevice,
    selectedFiles,
    incomingFilesMeta,
    receivedFiles,
    totalBytes,
    transferredBytes,
    currentSpeed,
    estimatedSecondsRemaining,
    currentFileName,
    currentFileBytes,
    currentFileTotalBytes,
    currentFileIndex,
    fileProgress,
    addFiles,
    removeFile,
    clearFiles,
    createRoom,
    joinRoom,
    acceptTransfer,
    rejectTransfer,
    cancelTransfer,
    downloadFile,
    downloadAllFiles,
    resetTransfer
  } = useFileTransfer();

  const [inputCode, setInputCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  // Check URL query parameters for room link: e.g. /?room=XYZ
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !roomId && status === 'idle') {
      joinRoom(roomParam);
    }
  }, [joinRoom, roomId, status]);

  // Global window drag-and-drop overlay listener
  useEffect(() => {
    let dragCounter = 0;

    const handleWindowDragEnter = (e) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsWindowDragging(false);
        dragCounter = 0;
      }
    };

    const handleWindowDragOver = (e) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e) => {
      e.preventDefault();
      dragCounter = 0;
      setIsWindowDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        sounds.pop();
        addFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [addFiles]);

  const handleJoinWithCode = (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    let targetCode = inputCode.trim();
    // Support pasting full URL like https://domain.com/?room=xyz
    if (targetCode.includes('room=')) {
      const match = targetCode.match(/room=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) targetCode = match[1];
    } else if (targetCode.includes('/')) {
      targetCode = targetCode.split('/').pop();
    }

    joinRoom(targetCode);
  };

  // Determine current high-level stage
  const isSelectingFiles = status === 'idle' || (status === 'creating' && !roomId);
  const isWaitingForReceiver = (status === 'waiting' || status === 'paired' || status === 'requesting') && role === 'sender';
  const isPromptingConsent = status === 'prompting' && role === 'receiver';
  const isConnectingOrTransferring = status === 'connecting' || status === 'transferring';
  const isCompleted = status === 'completed';
  const isFailedOrCancelled = status === 'failed' || status === 'cancelled' || status === 'disconnected';

  return (
    <section id="transfer-workspace" className="py-16 sm:py-24 relative px-4 sm:px-6 lg:px-8">
      {/* Global Fullscreen Drag Overlay */}
      <AnimatePresence>
        {isWindowDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#080B18]/90 backdrop-blur-xl border-4 border-dashed border-cyan flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-accent to-cyan flex items-center justify-center text-white shadow-glow-cyan mb-6 animate-bounce">
              <UploadCloud className="w-12 h-12" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
              Drop Files Anywhere to Share
            </h2>
            <p className="text-slate-300 max-w-md text-sm">
              Release to instantly add files to your sovereign peer-to-peer transfer workspace.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto">
        
        {/* Workspace Title & Dynamic Badge */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
              <span>Transfer Workspace</span>
              <span className="text-xs font-mono font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                P2P Engine
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select files to generate a direct one-time transfer link and QR code.
            </p>
          </div>

          <ConnectionStatusBadge
            status={status}
            role={role}
            peerDevice={peerDevice}
          />
        </div>

        {/* Dynamic Transition States */}
        <AnimatePresence mode="wait">

          {/* STAGE 1: FILE SELECTION (SENDER) & CODE JOIN */}
          {isSelectingFiles && (
            <motion.div
              key="file-select-stage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <GlassCard variant="default" className="p-6 sm:p-8">
                <FileSelector
                  onFilesSelected={(files) => {
                    sounds.pop();
                    addFiles(files);
                  }}
                  disabled={status === 'creating'}
                />

                <FileList
                  files={selectedFiles}
                  onRemoveFile={removeFile}
                  onClearAll={clearFiles}
                  disabled={status === 'creating'}
                />

                {selectedFiles.length > 0 ? (
                  <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-cyan" />
                      <span>Ready to generate one-time encrypted room link</span>
                    </div>

                    <Button
                      variant="glow"
                      size="lg"
                      icon={Share2}
                      loading={status === 'creating'}
                      onClick={createRoom}
                      className="w-full sm:w-auto"
                    >
                      Generate Transfer Link
                    </Button>
                  </div>
                ) : (
                  /* Quick Join Section when no files selected */
                  <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                    <span>Receiving files from another device?</span>
                    <button
                      onClick={() => setShowCodeInput(!showCodeInput)}
                      className="text-cyan hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{showCodeInput ? 'Hide Code Input' : 'Join with Room Code / URL'}</span>
                    </button>
                  </div>
                )}

                {/* Optional Room Code Input */}
                <AnimatePresence>
                  {showCodeInput && selectedFiles.length === 0 && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={handleJoinWithCode}
                      className="mt-4 pt-4 border-t border-white/5 overflow-hidden"
                    >
                      <label className="block text-xs font-medium text-slate-300 mb-2">
                        Enter 8-character Room Code or Transfer Link:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inputCode}
                          onChange={(e) => setInputCode(e.target.value)}
                          placeholder="e.g. FSG_Sgk2 or https://droplink.app/?room=FSG_Sgk2"
                          className="flex-1 bg-surface-muted text-xs sm:text-sm text-white px-3.5 py-2.5 rounded-xl border border-surface-border focus:border-cyan focus:outline-none font-mono"
                        />
                        <Button
                          variant="glow"
                          size="md"
                          icon={ArrowRight}
                          type="submit"
                          disabled={!inputCode.trim()}
                        >
                          Join
                        </Button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          )}

          {/* STAGE 2: WAITING FOR RECEIVER (LINK & QR CARD) */}
          {isWaitingForReceiver && (
            <motion.div
              key="waiting-stage"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
            >
              <LinkSharingCard
                roomId={roomId}
                roomUrl={roomUrl}
                expiresAt={expiresAt}
                peerConnected={status === 'paired' || status === 'requesting'}
                onCancel={cancelTransfer}
              />
            </motion.div>
          )}

          {/* STAGE 3: RECEIVER CONSENT MODAL */}
          {isPromptingConsent && (
            <ReceiverConsentModal
              senderDevice={peerDevice}
              files={incomingFilesMeta}
              totalSize={totalBytes}
              onAccept={acceptTransfer}
              onReject={rejectTransfer}
            />
          )}

          {/* STAGE 4: ACTIVE WEBRTC TRANSFER IN PROGRESS */}
          {isConnectingOrTransferring && (
            <motion.div
              key="transferring-stage"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
            >
              <TransferProgressCard
                role={role}
                transferredBytes={transferredBytes}
                totalBytes={totalBytes}
                currentSpeed={currentSpeed}
                estimatedSecondsRemaining={estimatedSecondsRemaining}
                currentFileName={currentFileName}
                currentFileBytes={currentFileBytes}
                currentFileTotalBytes={currentFileTotalBytes}
                currentFileIndex={currentFileIndex}
                totalFiles={role === 'sender' ? selectedFiles.length : incomingFilesMeta.length}
                fileProgress={fileProgress}
                onCancel={cancelTransfer}
              />
            </motion.div>
          )}

          {/* STAGE 5: TRANSFER SUCCESS VIEW */}
          {isCompleted && (
            <motion.div
              key="completed-stage"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
            >
              <TransferSuccessView
                role={role}
                files={role === 'receiver' ? receivedFiles : selectedFiles}
                totalBytes={totalBytes}
                onDownloadFile={downloadFile}
                onDownloadAll={downloadAllFiles}
                onReset={resetTransfer}
              />
            </motion.div>
          )}

          {/* STAGE 6: CANCELLED OR FAILED VIEW */}
          {isFailedOrCancelled && (
            <motion.div
              key="failed-stage"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard variant="default" className="w-full max-w-xl mx-auto p-8 text-center border-rose-500/25">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  {status === 'cancelled' ? 'Transfer Cancelled' : status === 'disconnected' ? 'Peer Disconnected' : 'Transfer Failed'}
                </h3>
                <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
                  {errorMessage || (status === 'cancelled'
                    ? 'The transfer was stopped by one of the participating devices.'
                    : 'The direct peer-to-peer connection was interrupted.')}
                </p>

                <div className="flex justify-center gap-3">
                  <Button
                    variant="glow"
                    size="md"
                    icon={RefreshCw}
                    onClick={resetTransfer}
                  >
                    Start New Transfer
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </section>
  );
}

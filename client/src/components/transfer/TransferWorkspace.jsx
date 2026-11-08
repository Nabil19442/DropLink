import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Share2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
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

  // Check URL query parameters for room link: e.g. /?room=XYZ
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && !roomId && status === 'idle') {
      joinRoom(roomParam);
    }
  }, [joinRoom, roomId, status]);

  // Determine current high-level stage
  const isSelectingFiles = status === 'idle' || (status === 'creating' && !roomId);
  const isWaitingForReceiver = (status === 'waiting' || status === 'paired' || status === 'requesting') && role === 'sender';
  const isPromptingConsent = status === 'prompting' && role === 'receiver';
  const isConnectingOrTransferring = status === 'connecting' || status === 'transferring';
  const isCompleted = status === 'completed';
  const isFailedOrCancelled = status === 'failed' || status === 'cancelled' || status === 'disconnected';

  return (
    <section id="transfer-workspace" className="py-16 sm:py-24 relative px-4 sm:px-6 lg:px-8">
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

          {/* STAGE 1: FILE SELECTION (SENDER) */}
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
                  onFilesSelected={addFiles}
                  disabled={status === 'creating'}
                />

                <FileList
                  files={selectedFiles}
                  onRemoveFile={removeFile}
                  onClearAll={clearFiles}
                  disabled={status === 'creating'}
                />

                {selectedFiles.length > 0 && (
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
                )}
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


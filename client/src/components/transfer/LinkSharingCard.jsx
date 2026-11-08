import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, Share2, QrCode, Clock, Wifi, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { GlassCard } from '../ui/GlassCard.jsx';

export function LinkSharingCard({
  roomId,
  roomUrl,
  expiresAt,
  peerConnected = false,
  onCancel
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasWebShare, setHasWebShare] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Generate QR Code
  useEffect(() => {
    if (roomUrl) {
      QRCode.toDataURL(roomUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#080B18',
          light: '#FFFFFF',
        },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [roomUrl]);

  // Check Web Share API
  useEffect(() => {
    setHasWebShare(typeof navigator !== 'undefined' && !!navigator.share);
  }, []);

  // Expiration countdown
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, expiresAt - now);
      if (diff === 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DropLink File Transfer',
          text: 'Open this link to receive files via secure direct peer-to-peer connection.',
          url: roomUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error', err);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <GlassCard variant="glow" className="w-full max-w-xl mx-auto p-6 sm:p-8">
      {/* Dynamic Status Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${peerConnected ? 'bg-emerald-400' : 'bg-cyan'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${peerConnected ? 'bg-emerald-400' : 'bg-cyan'}`} />
          </div>
          <span className="font-display font-semibold text-white text-base">
            {peerConnected ? 'Device Connected — Preparing Transfer' : 'Waiting for Receiving Device...'}
          </span>
        </div>

        {timeLeft && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Expires: {timeLeft}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
        {/* QR Code Container */}
        <div className="sm:col-span-5 flex flex-col items-center">
          <div className="p-3 bg-white rounded-2xl shadow-2xl shadow-cyan-900/30 flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Scan QR code to receive files"
                className="w-40 h-40 sm:w-44 sm:h-44 object-contain rounded-xl"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-700" />
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-cyan" /> Scan with camera
          </span>
        </div>

        {/* URL & Sharing Buttons */}
        <div className="sm:col-span-7 flex flex-col justify-center space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Shareable Transfer Link
            </label>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-muted border border-surface-border">
              <input
                type="text"
                readOnly
                value={roomUrl}
                className="bg-transparent text-xs sm:text-sm text-cyan font-mono flex-1 outline-none px-2 select-all overflow-ellipsis"
              />
              <Button
                variant={copied ? 'primary' : 'secondary'}
                size="sm"
                icon={copied ? Check : Copy}
                onClick={handleCopy}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-2">
            {hasWebShare && (
              <Button
                variant="glow"
                size="sm"
                icon={Share2}
                onClick={handleShare}
                className="flex-1"
              >
                Share Link
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="text-slate-400 hover:text-rose-400"
            >
              Cancel
            </Button>
          </div>

          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-slate-300 flex items-start gap-2">
            <Wifi className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <span>
              Keep this window open. Once the recipient connects, transfer begins automatically.
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

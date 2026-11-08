# DropLink — Global Peer-to-Peer File Sharing Platform

> **"Your Files. Your Devices. Anywhere."**

DropLink is a modern, production-grade, sovereign peer-to-peer file transfer platform built on WebRTC DataChannels and Socket.IO signaling. It enables high-speed, direct, and cryptographically encrypted file transfers between smartphones, laptops, and tablets worldwide without accounts, cloud storage, or third-party file retention.

---

## 🌟 Key Highlights & Architectural Features

- **Direct WebRTC DataChannel Streaming**: Files are transferred memory-to-memory via peer-to-peer data pipes. They never touch a central server disk or database.
- **Backpressure & Flow Control**: Engineered chunk-based transmission (64 KB chunks) with active buffer drainage (`bufferedAmount` and `bufferedAmountLowThreshold`), preventing browser tab memory crashes even for gigabyte-scale files.
- **Zero-Storage Privacy Architecture**: Zero database, zero logins, zero accounts, and zero file logging. Rooms exist strictly as ephemeral in-memory records with automatic TTL expirations.
- **Explicit Peer Consent Model**: Receiving devices always see sender identity, file list, and total size before explicitly choosing to accept or decline transfers.
- **Global NAT Traversal**: Out-of-the-box STUN server support with plug-and-play TURN server credentials for restrictive symmetric NATs and carrier-grade cellular networks (CGNAT).
- **Premium Glassmorphic Design**: Custom designed with Midnight Navy (`#080B18`), Dark Indigo (`#11152B`), Electric Violet (`#8B5CF6`), and Cyan (`#22D3EE`). Featuring interactive Framer Motion micro-interactions, custom SVG device connection scene, dynamic QR code generation, and celebratory confetti.
- **Cross-Platform Responsive**: Fluid experience across iOS Safari, Android Chrome, macOS, Windows, and Linux.

---

## 🏗️ Architecture & Technology Stack

```
DropLink Architecture
┌─────────────────────────┐                   ┌─────────────────────────┐
│     Sender Device       │                   │     Receiver Device     │
│  (Phone / Laptop / PC)  │                   │  (Phone / Laptop / PC)  │
└────────────┬────────────┘                   └────────────┬────────────┘
             │                                             │
             │   1. HTTP/Socket.IO Ephemeral Signaling     │
             │   (Room creation, SDP Offer/Answer, ICE)    │
             ▼                                             ▼
       ┌─────────────────────────────────────────────────────────┐
       │             DropLink Signaling Server (Node.js)         │
       │             - In-memory Map (TTL Auto-Purge)            │
       │             - Strict Schema & Rate Limiting             │
       │             - Zero File Payload Access                  │
       └─────────────────────────────────────────────────────────┘
             ▲                                             ▲
             │                                             │
             │   2. Direct DTLS/SCTP WebRTC DataChannel   │
             │   (64KB Chunked Binary ArrayBuffers)        │
             └─────────────────────────────────────────────┘
```

### Technology Stack:
- **Frontend**:
  - React 19
  - Vite 6
  - Tailwind CSS 3
  - Framer Motion 12
  - Lucide React
  - Zustand 5
  - QRCode (`qrcode`)
  - Canvas Confetti
- **Backend**:
  - Node.js (v18+)
  - Express.js
  - Socket.IO 4
  - Helmet & Express Rate Limiter
  - In-Memory Ephemeral Map Storage
- **File Transfer**:
  - WebRTC DataChannel (`ordered: true`)
  - STUN / TURN Fallback Relay
  - Stream/chunk processing using File API, Slices, and ArrayBuffers

---

## 📁 Repository Structure

```
droplink/
├── package.json                   # Root workspace scripts (dev, test, build)
├── TURN_SETUP_GUIDE.md            # Complete coturn production deployment guide
├── server/
│   ├── package.json
│   ├── .env.example
│   ├── .env
│   ├── src/
│   │   ├── config/index.js        # Server & ICE configuration
│   │   ├── controllers/roomController.js # REST API handlers
│   │   ├── services/roomService.js       # Ephemeral Map room management & TTL
│   │   ├── socket/socketHandler.js       # Socket.IO signaling protocol
│   │   ├── middleware/rateLimiter.js     # Rate limiting middleware
│   │   ├── middleware/errorHandler.js    # Error handling
│   │   ├── utils/logger.js               # Structured logger (zero file contents)
│   │   ├── utils/validators.js           # SDP, ICE, Room & File metadata validators
│   │   └── server.js                     # Express + Socket.IO bootstrap
│   └── test/
│       └── e2e-signaling.test.js  # 19 automated tests for signaling & rooms
└── client/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    ├── .env
    └── src/
        ├── styles/index.css       # Tailwind + glassmorphic custom styling
        ├── utils/
        │   ├── formatters.js      # formatBytes, formatSpeed, formatDuration
        │   ├── fileTypes.js       # File categories & badge styles
        │   └── deviceDetect.js    # Browser & OS fingerprinting for friendly labels
        ├── store/transferStore.js # Zustand state management
        ├── services/
        │   ├── socketClient.js    # Socket.IO client singleton
        │   ├── webrtcEngine.js    # WebRTC DataChannel engine with backpressure
        │   └── webrtcEngine.test.js # 7 automated tests for chunking & Blobs
        ├── hooks/
        │   └── useFileTransfer.js # Unified orchestrator hook for UI
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.jsx     # Navigation with live signaling pill
        │   │   └── Footer.jsx     # Sovereign privacy guarantees
        │   ├── ui/
        │   │   ├── Button.jsx     # SaaS buttons (glow, primary, ghost, danger)
        │   │   ├── GlassCard.jsx  # Glassmorphism container
        │   │   ├── Badge.jsx      # Animated status badges
        │   │   └── Toast.jsx      # Dismissible floating alerts
        │   ├── landing/
        │   │   ├── Hero.jsx       # Hero headline & CTAs
        │   │   ├── DeviceTransferGraphic.jsx # Interactive SVG/CSS device connection visual
        │   │   ├── FeaturesSection.jsx       # Architecture highlights
        │   │   ├── HowItWorksSection.jsx     # 3-step visual workflow
        │   │   ├── SecuritySection.jsx       # Zero-trust privacy pillars
        │   │   └── FaqSection.jsx            # Interactive FAQ accordion
        │   └── transfer/
        │       ├── TransferWorkspace.jsx     # State machine workflow container
        │       ├── FileSelector.jsx          # Drag-and-drop file selector
        │       ├── FileList.jsx              # Selected files with size badges
        │       ├── LinkSharingCard.jsx       # Room URL, QR code, Web Share API
        │       ├── ConnectionStatusBadge.jsx # Dynamic multi-state badge
        │       ├── ReceiverConsentModal.jsx  # Sender device & file consent prompt
        │       ├── TransferProgressCard.jsx  # Speed, ETA, overall & per-file progress
        │       └── TransferSuccessView.jsx   # Confetti celebration & file downloads
        ├── App.jsx
        └── main.jsx
```

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- Node.js v18.0.0 or higher
- npm (v9+) or pnpm

### 2. Installation
Clone the repository and install root, server, and client dependencies:

```bash
git clone https://github.com/your-username/droplink.git
cd droplink

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

### 3. Environment Setup
Create environment files from examples:

**Server (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
ROOM_TTL_MS=1800000
MAX_FILES_PER_TRANSFER=50
MAX_TOTAL_SIZE_BYTES=5368709120

# Optional TURN configuration
# TURN_SERVER_URL=turn:turn.yourdomain.com:3478?transport=udp
# TURN_USERNAME=your_username
# TURN_CREDENTIAL=your_password
```

**Client (`client/.env`):**
```env
# Leave blank in development to leverage the Vite proxy (http://localhost:5000)
VITE_SERVER_URL=
```

### 4. Run Development Servers
From the root directory, start both the Node.js signaling server and the Vite dev server concurrently:

```bash
npm run dev
```

- **Client App**: [http://localhost:5173](http://localhost:5173)
- **Signaling API**: [http://localhost:5000](http://localhost:5000)
- **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Automated Testing

DropLink includes two test suites:
1. **Server E2E Signaling & Room Lifecycle**: 19 tests covering socket events, room creation, REST endpoints, participant limits, rate limiting, and peer cleanup.
2. **WebRTC Chunking & Reassembly**: 7 tests verifying chunk slicing math, binary array stream integrity, byte-for-byte SHA/ArrayBuffer verification, and cancellation.

To execute all 26 tests:

```bash
npm test
```

Sample output:
```
🧪 Starting DropLink Comprehensive E2E Test Suite...
  ✓ PASS: Health endpoint returns 200 OK
  ✓ PASS: ICE servers endpoint returns valid array
  ✓ PASS: Sender socket connected
  ✓ PASS: Sender creates room with valid room ID
  ✓ PASS: REST API returns valid room information
  ✓ PASS: Invalid room ID format returns 400 Bad Request
  ✓ PASS: Non-existent room returns 404 Not Found
  ✓ PASS: Sender received receiver:joined event with device details
  ✓ PASS: Receiver successfully joins room
  ✓ PASS: 3rd participant is rejected with ROOM_FULL
  ✓ PASS: Receiver receives transfer:incoming with accurate files and totalSize
  ✓ PASS: Sender successfully offers valid file metadata
  ✓ PASS: Invalid empty file list is rejected by validator
  ✓ PASS: Sender receives transfer:decision (accepted)
  ✓ PASS: Receiver receives WebRTC SDP offer
  ✓ PASS: Sender receives WebRTC SDP answer
  ✓ PASS: ICE candidate correctly forwarded to partner
  ✓ PASS: Sender receives peer:disconnected when receiver leaves
  ✓ PASS: Room was deleted and cleaned from in-memory Map after participants left
Test Results: 19 PASSED, 0 FAILED

🧪 Testing WebRTC Engine chunking & reassembly logic...
  ✓ PASS: Engine initialized with ICE servers
  ✓ PASS: Receiver successfully triggered onFileReceived
  ✓ PASS: Reconstructed file name matches
  ✓ PASS: Reconstructed file size matches exactly
  ✓ PASS: Reconstructed object has valid Blob
  ✓ PASS: Reconstructed binary data matches byte-for-byte
  ✓ PASS: Cancellation control message properly handled
WebRTC Engine Tests: 7 PASSED, 0 FAILED
```

---

## 🌐 Production Deployment Guide

DropLink is designed for zero-hassle deployment. In production, the backend server can automatically serve the compiled frontend from `client/dist`.

### Step 1: Build the Client
```bash
npm run build
```

### Step 2: Start the Production Server
```bash
cd server
NODE_ENV=production PORT=5000 npm start
```

### Step 3: Nginx Reverse Proxy & SSL (Recommended)
Because WebRTC and modern browser APIs (`crypto`, `navigator.share`) require a secure context, HTTPS is required in production.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name droplink.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name droplink.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/droplink.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/droplink.yourdomain.com/privkey.pem;

    # Optimize SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📡 Production TURN Server (Coturn) Guide

For corporate firewalls, symmetric NATs, or restrictive cellular networks where STUN cannot negotiate a direct peer connection, deploy a `coturn` TURN relay.

See the dedicated [TURN_SETUP_GUIDE.md](./TURN_SETUP_GUIDE.md) for step-by-step installation instructions for Ubuntu/Debian and Docker.

---

## 🔒 Security & Privacy Guarantees

1. **No Data Retention**: The server has no database and zero persistent storage.
2. **End-to-End Encryption**: WebRTC channels use DTLS 1.2/1.3 with AES-128-GCM / AES-256-GCM.
3. **No File Inspection**: File contents are never routed through or logged on the signaling server.
4. **Consent-Gated Reception**: Receiving users must explicitly accept incoming transfers.
5. **Auto-Expiring Rooms**: Rooms are automatically destroyed when peers leave or when the 30-minute inactivity TTL expires.

---

## 📄 License
MIT License. Built for open, sovereign, and privacy-respecting file exchange.


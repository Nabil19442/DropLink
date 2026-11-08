# DropLink Production Deployment Guide

This guide details the step-by-step production deployment of **DropLink** across three dedicated targets:
- **Frontend**: [Vercel](https://vercel.com) (Global Edge CDN, SPA routing)
- **Backend**: [Render](https://render.com) (Node.js + Socket.IO signaling service)
- **WebRTC Relay**: [Coturn](https://github.com/coturn/coturn) on a Linux VPS (STUN/TURN for NAT traversal)

---

## 🗺️ Production Architecture

```
┌─────────────────────────────────┐
│     Vercel (Global Edge CDN)    │
│     Frontend: React 19 + Vite   │
│     https://droplink.vercel.app │
└────────────────┬────────────────┘
                 │
                 │ 1. Ephemeral Signaling (WebSocket + WSS)
                 ▼
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│      Render (Web Service)       │       │       Coturn on Linux VPS       │
│      Signaling Server (Node.js) │       │   STUN / TURN Packet Relay      │
│  https://*.onrender.com         │       │   Ports: 3478, 5349, 49152-65535│
└─────────────────────────────────┘       └────────────────┬────────────────┘
                 ▲                                         │
                 │ 2. Direct WebRTC DataChannel (Encrypted)│ 3. Fallback Relay
                 └───────────────────┬─────────────────────┘    (Symmetric NAT)
                                     ▼
                      ┌─────────────────────────────┐
                      │    Sender <──> Receiver     │
                      │    Memory-to-Memory P2P     │
                      └─────────────────────────────┘
```

---

## Step 1: Deploy Backend Signaling Server on Render

### Option A: 1-Click Blueprint Deploy (Recommended)
The repository includes a ready-to-use [`render.yaml`](./render.yaml) specification:
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **Blueprints** → **New Blueprint Instance**.
3. Select your `DropLink` repository.
4. Render will read `render.yaml` and configure the service automatically.
5. Provide your frontend Vercel URL when prompted for `CLIENT_ORIGIN`.

### Option B: Manual Web Service Setup
1. In the Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository: `https://github.com/Nabil19442/DropLink`.
3. Configure the following service settings:
   - **Name**: `droplink-signaling`
   - **Region**: Select closest to your users (e.g., `Oregon (US West)` or `Frankfurt (EU)`)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (uses repo root)
   - **Runtime**: `Node`
   - **Build Command**: `npm install --prefix server`
   - **Start Command**: `cd server && npm start`
   - **Instance Type**: `Free`
4. Add the following **Environment Variables**:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Render assigns dynamic port |
| `CLIENT_ORIGIN` | `https://your-droplink-app.vercel.app` | Vercel production domain |
| `ALLOW_VERCEL_PREVIEWS` | `true` | Permits `*.vercel.app` preview branches |
| `ROOM_TTL_MS` | `1800000` | 30 minutes in-memory room TTL |
| `MAX_FILES_PER_TRANSFER` | `50` | Maximum file count per batch |
| `MAX_TOTAL_SIZE_BYTES` | `5368709120` | 5 GB transfer limit per batch |
| `TURN_SERVER_URL` | *(Optional)* | Coturn URLs (see Step 3) |
| `TURN_USERNAME` | *(Optional)* | Coturn username |
| `TURN_CREDENTIAL` | *(Optional)* | Coturn password |

5. Click **Create Web Service**.
6. Once deployed, test the health check endpoint in your browser:
   ```
   https://droplink-signaling.onrender.com/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "service": "DropLink Signaling Server",
     "activeRooms": 0,
     "timestamp": "2026-11-09T..."
   }
   ```

---

## Step 2: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `Nabil19442/DropLink`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` *(or leave blank; the repository includes both `client/vercel.json` and root `vercel.json`)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables** and add:

| Key | Example Value | Notes |
| :--- | :--- | :--- |
| `VITE_SERVER_URL` | `https://droplink-signaling.onrender.com` | Your Render backend URL *(no trailing slash)* |
| `VITE_APP_URL` | `https://your-app.vercel.app` | Your Vercel frontend URL |

6. Click **Deploy**.
7. Vercel will build and deploy your app globally. Test accessing `https://your-app.vercel.app`.

> **SPA Routing Note**: [`client/vercel.json`](./client/vercel.json) rewrites all sub-routes and query parameters (such as `/?room=XYZ`) back to `/index.html` to prevent 404s on browser reloads.

---

## Step 3: Deploy Coturn TURN Server on a Linux VPS

STUN handles 80-85% of standard residential peer connections. For cellular mobile connections (CGNAT), corporate firewalls, and symmetric NATs, a Coturn TURN server is required.

### 1. Provision a Cloud VPS
Get an inexpensive Linux VPS (Ubuntu 22.04 / 24.04 LTS) from DigitalOcean, Hetzner, AWS EC2, or Linode.

### 2. Open Firewall Ports
Ensure your cloud firewall allows the following ports:

```bash
# STUN/TURN default ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# UDP Relay dynamic port range
sudo ufw allow 49152:65535/udp
sudo ufw reload
```

### 3. Install and Configure Coturn
```bash
sudo apt update && sudo apt install -y coturn

# Enable daemon
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn

# Backup and create turnserver.conf
sudo mv /etc/turnserver.conf /etc/turnserver.conf.bak
sudo nano /etc/turnserver.conf
```

Paste this production configuration:

```ini
listening-port=3478
tls-listening-port=5349
fingerprint
lt-cred-mech
user=droplink_user:StrongSecretPassword123!
realm=turn.yourdomain.com
server-name=droplink-coturn

# Use your VPS public IPv4 address
external-ip=YOUR_VPS_PUBLIC_IP

min-port=49152
max-port=65535
no-cli
no-tcp-relay
stale-nonce
log-file=/var/log/turnserver.log
```

Restart and verify Coturn:
```bash
sudo systemctl restart coturn
sudo systemctl status coturn
```

### 4. Link Coturn to Render Backend
In your Render Dashboard for `droplink-signaling`, set:
- `TURN_SERVER_URL`: `turn:YOUR_VPS_IP:3478?transport=udp,turn:YOUR_VPS_IP:3478?transport=tcp`
- `TURN_USERNAME`: `droplink_user`
- `TURN_CREDENTIAL`: `StrongSecretPassword123!`

The backend will automatically provide these credentials to authenticated peers via `/api/config/ice` without exposing raw secrets to the public client.

---

## Step 4: Verification & Smoke Testing Checklist

- [ ] **Render Health Check**: Visit `https://your-backend.onrender.com/api/health` → returns `{"status":"ok"}`.
- [ ] **ICE Configuration**: Visit `https://your-backend.onrender.com/api/config/ice` → returns valid `iceServers` array.
- [ ] **Vercel Frontend**: Load `https://your-app.vercel.app` → live signaling pill shows green "Signaling Live".
- [ ] **Room Creation**: Select a file, click **Generate Transfer Link** → QR code and room URL render with the production domain.
- [ ] **Cross-Device Transfer**:
  - Open the room link on a smartphone on 4G/5G mobile data.
  - Smartphone receives incoming consent modal showing laptop OS and file summary.
  - Tap **Accept Transfer**.
  - Direct WebRTC stream transfers file with live speed, ETA, and success confetti celebration.
- [ ] **Batch Download**: On multiple files, verify **Download ZIP Archive** packages files in-browser.

---

## 🛠️ Troubleshooting

### 1. Render Free Tier Cold Starts
- **Symptom**: First room creation takes 30-50 seconds.
- **Cause**: Render free tier instances spin down after 15 minutes of inactivity.
- **Solution**: The DropLink frontend automatically uses a resilient reconnection backoff. For production enterprise use, upgrade the Render instance to `Starter` ($7/mo) to keep it warm 24/7.

### 2. CORS Blocked Errors
- **Symptom**: Browser console shows `Access to fetch has been blocked by CORS policy`.
- **Cause**: The `CLIENT_ORIGIN` variable on Render does not match your Vercel URL.
- **Fix**: Update `CLIENT_ORIGIN` on Render to match your exact Vercel URL (e.g., `https://droplink.vercel.app`), without a trailing slash. If using custom domains, separate them with commas.

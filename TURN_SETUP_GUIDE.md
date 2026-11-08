# Production Coturn TURN Server Setup Guide for DropLink

## Why is a TURN Server Required?

While STUN allows approximately 80–85% of peer-to-peer WebRTC connections to succeed by discovering public IP addresses and ports, certain network environments cannot establish direct peer-to-peer connections:
1. **Symmetric NATs**: Common in corporate networks, university campuses, and certain mobile carriers.
2. **Strict Firewalls**: Restrictive UDP port blocking on corporate or public Wi-Fi networks.
3. **Carrier-Grade NAT (CGNAT)**: Cellular mobile networks where multiple mobile devices share single IPv4 endpoints with randomized port mappings.

When direct STUN negotiation fails, WebRTC falls back to a **TURN (Traversal Using Relays around NAT)** server to securely relay encrypted DTLS packets between peers.

---

## Architecture

```
  Sender (NAT A)                                Receiver (NAT B)
        │                                              │
        │─── Direct P2P Attempt Failed (Symmetric NAT)─┤
        │                                              │
        ▼                                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Coturn TURN Relay Server                  │
│               (Relays Encrypted DTLS/SCTP Packets)           │
└──────────────────────────────────────────────────────────────┘
```

> **Privacy Note**: Even through a TURN relay, your files remain end-to-end encrypted with DTLS. The TURN server merely relays opaque UDP/TCP packets and cannot inspect your files.

---

## Option 1: Native Installation on Ubuntu / Debian

### 1. Install Coturn
```bash
sudo apt update
sudo apt install -y coturn
```

### 2. Enable Coturn Daemon
Edit `/etc/default/coturn`:
```bash
sudo nano /etc/default/coturn
```
Uncomment or add:
```
TURNSERVER_ENABLED=1
```

### 3. Configure `turnserver.conf`
Backup original configuration and create a new one:
```bash
sudo mv /etc/turnserver.conf /etc/turnserver.conf.bak
sudo nano /etc/turnserver.conf
```

Paste the following configuration:
```ini
# Network listening ports
listening-port=3478
tls-listening-port=5349

# Public IP of your VPS / Cloud Instance
external-ip=YOUR_SERVER_PUBLIC_IP

# Realm and Server name
realm=turn.yourdomain.com
server-name=droplink-turn

# Authentication: long-term credentials
lt-cred-mech
user=droplink_user:YOUR_STRONG_PASSWORD

# UDP Relay Port Range
min-port=49152
max-port=65535

# Security and Performance
no-cli
no-tcp-relay
stale-nonce
fingerprint

# Optional: TLS / TURNS Certificates (Recommended for Port 5349)
# cert=/etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem
# pkey=/etc/letsencrypt/live/turn.yourdomain.com/privkey.pem
# cipher-list="HIGH"
```

### 4. Firewall Configuration (UFW)
Open necessary ports on your cloud firewall (AWS Security Groups, DigitalOcean Cloud Firewall, or local UFW):

```bash
# STUN/TURN standard ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# UDP Relay port range
sudo ufw allow 49152:65535/udp

sudo ufw reload
```

### 5. Start and Verify Coturn
```bash
sudo systemctl restart coturn
sudo systemctl status coturn
```

---

## Option 2: Docker Deployment

You can deploy `coturn` in seconds using Docker:

```bash
docker run -d \
  --name droplink-coturn \
  --net=host \
  --restart=always \
  coturn/coturn \
  -n \
  --log-file=stdout \
  --external-ip=YOUR_SERVER_PUBLIC_IP \
  --listening-port=3478 \
  --tls-listening-port=5349 \
  --min-port=49152 \
  --max-port=65535 \
  --realm=turn.yourdomain.com \
  --lt-cred-mech \
  --user=droplink_user:YOUR_STRONG_PASSWORD
```

---

## Connecting Coturn to DropLink

Update your `server/.env` file:

```env
TURN_SERVER_URL=turn:turn.yourdomain.com:3478?transport=udp,turn:turn.yourdomain.com:3478?transport=tcp
TURN_USERNAME=droplink_user
TURN_CREDENTIAL=YOUR_STRONG_PASSWORD
```

When configured, DropLink's server automatically provides these credentials via `/api/config/ice` to authenticating peers without exposing master server tokens.

---

## Testing Your TURN Server

You can verify your TURN server configuration using the official WebRTC ICE Gathering test tool:
1. Open [WebRTC Trickle ICE Tool](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/).
2. Under **ICE Servers**, add:
   - STUN or TURN URI: `turn:turn.yourdomain.com:3478?transport=udp`
   - TURN username: `droplink_user`
   - TURN password: `YOUR_STRONG_PASSWORD`
3. Click **Add Server** and then **Gather candidates**.
4. If configured properly, you will see candidates with `typ relay` appearing in the list.


import http from 'http';
import { io as Client } from 'socket.io-client';

const SERVER_PORT = 5055;
process.env.PORT = SERVER_PORT;

async function runTests() {
  console.log('🧪 Starting DropLink Comprehensive E2E Test Suite...\n');

  // 1. Boot server in-process on test port
  const { default: express } = await import('express');
  const { Server } = await import('socket.io');
  const cors = (await import('cors')).default;
  const helmet = (await import('helmet')).default;
  const { roomController } = await import('../src/controllers/roomController.js');
  const { setupSocketHandlers } = await import('../src/socket/socketHandler.js');
  const { roomService } = await import('../src/services/roomService.js');

  const app = express();
  const server = http.createServer(app);
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', roomController.getHealth);
  app.get('/api/config/ice', roomController.getIceServers);
  app.get('/api/rooms/:roomId', roomController.getRoomInfo);

  const io = new Server(server, { cors: { origin: '*' } });
  setupSocketHandlers(io);

  await new Promise((resolve) => server.listen(SERVER_PORT, resolve));
  console.log(`✓ Test signaling server booted on port ${SERVER_PORT}`);

  const SERVER_URL = `http://localhost:${SERVER_PORT}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // TEST 1: Health endpoint
    const healthRes = await fetch(`${SERVER_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'ok', 'Health endpoint returns 200 OK');

    // TEST 2: ICE Config endpoint
    const iceRes = await fetch(`${SERVER_URL}/api/config/ice`);
    const iceData = await iceRes.json();
    assert(iceRes.status === 200 && Array.isArray(iceData.iceServers), 'ICE servers endpoint returns valid array');

    // TEST 3: Sender connects and creates room
    const senderSocket = Client(SERVER_URL, { transports: ['websocket'] });
    await new Promise(r => senderSocket.on('connect', r));
    assert(senderSocket.connected, 'Sender socket connected');

    let createdRoomId = null;
    let expiresAt = null;

    await new Promise((resolve) => {
      senderSocket.emit('room:create', {
        deviceInfo: { type: 'desktop', os: 'Windows', browser: 'Chrome', label: 'Windows (Chrome)' }
      }, (res) => {
        assert(res.success && typeof res.roomId === 'string' && res.roomId.length >= 6, 'Sender creates room with valid room ID');
        createdRoomId = res.roomId;
        expiresAt = res.expiresAt;
        resolve();
      });
    });

    // TEST 4: Query room info via REST
    const roomInfoRes = await fetch(`${SERVER_URL}/api/rooms/${createdRoomId}`);
    const roomInfoData = await roomInfoRes.json();
    assert(roomInfoRes.status === 200 && roomInfoData.data.id === createdRoomId, 'REST API returns valid room information');

    // TEST 5: Invalid room ID format returns 400
    const invalidRoomRes = await fetch(`${SERVER_URL}/api/rooms/bad!id@chars`);
    assert(invalidRoomRes.status === 400, 'Invalid room ID format returns 400 Bad Request');

    // TEST 6: Non-existent room returns 404
    const notFoundRes = await fetch(`${SERVER_URL}/api/rooms/NonExistentRoom123`);
    assert(notFoundRes.status === 404, 'Non-existent room returns 404 Not Found');

    // TEST 7: Receiver connects and joins room
    const receiverSocket = Client(SERVER_URL, { transports: ['websocket'] });
    await new Promise(r => receiverSocket.on('connect', r));

    // Listen for sender notification of receiver arrival
    const senderReceiverJoinedPromise = new Promise((resolve) => {
      senderSocket.on('receiver:joined', (data) => {
        assert(data.deviceInfo?.os === 'iOS', 'Sender received receiver:joined event with device details');
        resolve();
      });
    });

    await new Promise((resolve) => {
      receiverSocket.emit('room:join', {
        roomId: createdRoomId,
        deviceInfo: { type: 'mobile', os: 'iOS', browser: 'Safari', label: 'iOS (Safari)' }
      }, (res) => {
        assert(res.success && res.roomId === createdRoomId, 'Receiver successfully joins room');
        resolve();
      });
    });

    await senderReceiverJoinedPromise;

    // TEST 8: Third device attempts to join -> ROOM_FULL rejection
    const thirdSocket = Client(SERVER_URL, { transports: ['websocket'] });
    await new Promise(r => thirdSocket.on('connect', r));

    await new Promise((resolve) => {
      thirdSocket.emit('room:join', {
        roomId: createdRoomId,
        deviceInfo: { type: 'desktop', os: 'Linux', browser: 'Firefox', label: 'Linux (Firefox)' }
      }, (res) => {
        assert(!res.success && res.code === 'ROOM_FULL', '3rd participant is rejected with ROOM_FULL');
        resolve();
      });
    });
    thirdSocket.disconnect();

    // TEST 9: File metadata offering & validation
    const sampleFiles = [
      { name: 'document.pdf', size: 1048576, type: 'application/pdf', lastModified: 1700000000000 },
      { name: 'video.mp4', size: 10485760, type: 'video/mp4', lastModified: 1700000000000 }
    ];

    const receiverIncomingPromise = new Promise((resolve) => {
      receiverSocket.on('transfer:incoming', (data) => {
        assert(data.files.length === 2 && data.totalSize === (1048576 + 10485760), 'Receiver receives transfer:incoming with accurate files and totalSize');
        resolve();
      });
    });

    await new Promise((resolve) => {
      senderSocket.emit('transfer:metadata', {
        roomId: createdRoomId,
        files: sampleFiles
      }, (res) => {
        assert(res.success && res.count === 2, 'Sender successfully offers valid file metadata');
        resolve();
      });
    });

    await receiverIncomingPromise;

    // TEST 10: Invalid file metadata rejection (e.g. empty files list)
    await new Promise((resolve) => {
      senderSocket.emit('transfer:metadata', {
        roomId: createdRoomId,
        files: []
      }, (res) => {
        assert(!res.success, 'Invalid empty file list is rejected by validator');
        resolve();
      });
    });

    // TEST 11: Receiver sends accept decision
    const senderDecisionPromise = new Promise((resolve) => {
      senderSocket.on('transfer:decision', (data) => {
        assert(data.accepted === true, 'Sender receives transfer:decision (accepted)');
        resolve();
      });
    });

    receiverSocket.emit('transfer:decision', {
      roomId: createdRoomId,
      accepted: true
    });

    await senderDecisionPromise;

    // TEST 12: WebRTC Offer relay
    const dummyOffer = { type: 'offer', sdp: 'v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
    const receiverOfferPromise = new Promise((resolve) => {
      receiverSocket.on('webrtc:offer', (data) => {
        assert(data.sdp.type === 'offer', 'Receiver receives WebRTC SDP offer');
        resolve();
      });
    });

    senderSocket.emit('webrtc:offer', {
      roomId: createdRoomId,
      sdp: dummyOffer
    });

    await receiverOfferPromise;

    // TEST 13: WebRTC Answer relay
    const dummyAnswer = { type: 'answer', sdp: 'v=0\r\no=- 54321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
    const senderAnswerPromise = new Promise((resolve) => {
      senderSocket.on('webrtc:answer', (data) => {
        assert(data.sdp.type === 'answer', 'Sender receives WebRTC SDP answer');
        resolve();
      });
    });

    receiverSocket.emit('webrtc:answer', {
      roomId: createdRoomId,
      sdp: dummyAnswer
    });

    await senderAnswerPromise;

    // TEST 14: WebRTC ICE Candidate relay
    const dummyCandidate = { candidate: 'candidate:842163049 1 udp 1677729535 192.168.1.100 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    const candidatePromise = new Promise((resolve) => {
      receiverSocket.on('webrtc:ice-candidate', (data) => {
        assert(data.candidate.candidate.includes('192.168.1.100'), 'ICE candidate correctly forwarded to partner');
        resolve();
      });
    });

    senderSocket.emit('webrtc:ice-candidate', {
      roomId: createdRoomId,
      candidate: dummyCandidate
    });

    await candidatePromise;

    // TEST 15: Receiver disconnects -> Sender notified
    const senderPeerDisconnectPromise = new Promise((resolve) => {
      senderSocket.on('peer:disconnected', (data) => {
        assert(data.role === 'receiver', 'Sender receives peer:disconnected when receiver leaves');
        resolve();
      });
    });

    receiverSocket.disconnect();
    await senderPeerDisconnectPromise;

    // TEST 16: Sender disconnects -> Room completely cleaned up
    senderSocket.disconnect();
    await new Promise(r => setTimeout(r, 200));

    const finalRoomRes = await fetch(`${SERVER_URL}/api/rooms/${createdRoomId}`);
    assert(finalRoomRes.status === 404, 'Room was deleted and cleaned from in-memory Map after participants left');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close();
    console.log(`\n================================`);
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================\n`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

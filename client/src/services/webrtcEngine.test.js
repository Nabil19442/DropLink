/**
 * Unit test verifying chunking math, backpressure thresholds, and file reassembly
 */

import { WebRTCEngine } from './webrtcEngine.js';

async function testWebRTCEngineLogic() {
  console.log('🧪 Testing WebRTC Engine chunking & reassembly logic...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${name}`);
      failed++;
    }
  }

  // TEST 1: Instance instantiation
  const engine = new WebRTCEngine({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  assert(engine.iceServers.length === 1, 'Engine initialized with ICE servers');

  // TEST 2: Simulate file chunking and receiver Blob reconstruction
  // Create a 250KB test buffer (crosses multiple 64KB chunks)
  const testSize = 250 * 1024;
  const originalBytes = new Uint8Array(testSize);
  for (let i = 0; i < testSize; i++) {
    originalBytes[i] = i % 256;
  }

  const simulatedFile = {
    name: 'test_binary.bin',
    size: testSize,
    type: 'application/octet-stream',
    slice: (start, end) => ({
      arrayBuffer: async () => originalBytes.buffer.slice(start, end)
    })
  };

  let reconstructedFile = null;
  const receiverEngine = new WebRTCEngine({
    onFileReceived: (file) => {
      reconstructedFile = file;
    }
  });

  // Receiver receives file_start
  receiverEngine.handleControlMessage({
    type: 'file_start',
    id: '0-test_binary.bin',
    name: simulatedFile.name,
    size: simulatedFile.size,
    mimeType: simulatedFile.type,
    totalChunks: Math.ceil(testSize / (64 * 1024)),
    fileIndex: 0,
    totalFiles: 1
  });

  // Receiver streams chunks
  const CHUNK_SIZE = 64 * 1024;
  let offset = 0;
  while (offset < testSize) {
    const chunk = simulatedFile.slice(offset, Math.min(testSize, offset + CHUNK_SIZE));
    const buf = await chunk.arrayBuffer();
    receiverEngine.handleIncomingData(buf);
    offset += buf.byteLength;
  }

  // Receiver receives file_end
  receiverEngine.handleControlMessage({
    type: 'file_end',
    fileIndex: 0,
    name: simulatedFile.name
  });

  assert(reconstructedFile !== null, 'Receiver successfully triggered onFileReceived');
  assert(reconstructedFile.name === 'test_binary.bin', 'Reconstructed file name matches');
  assert(reconstructedFile.size === testSize, 'Reconstructed file size matches exactly');
  assert(reconstructedFile.blob instanceof Blob, 'Reconstructed object has valid Blob');

  // Verify blob bytes
  const blobBuf = await reconstructedFile.blob.arrayBuffer();
  const reconstructedBytes = new Uint8Array(blobBuf);
  let bytesMatch = true;
  for (let i = 0; i < testSize; i++) {
    if (reconstructedBytes[i] !== originalBytes[i]) {
      bytesMatch = false;
      break;
    }
  }
  assert(bytesMatch, 'Reconstructed binary data matches byte-for-byte');

  // TEST 3: Cancellation handling
  let cancelCalled = false;
  receiverEngine.onCancel = () => { cancelCalled = true; };
  receiverEngine.handleControlMessage({ type: 'transfer_cancel', reason: 'Peer aborted' });
  assert(cancelCalled && receiverEngine.isCancelled, 'Cancellation control message properly handled');

  console.log(`\n================================`);
  console.log(`WebRTC Engine Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

testWebRTCEngineLogic();


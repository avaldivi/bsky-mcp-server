import WebSocket from 'ws'; // This is allowed because of esModuleInterop + allowSyntheticDefaultImports

const socket = new WebSocket('wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos');

socket.on('open', () => {
  console.log('✅ Connected to Firehose');
});

socket.on('message', (data: WebSocket.RawData) => {
  console.log('📩 Message received:', data);
});

socket.on('error', (err) => {
  console.error('❌ WebSocket error:', err);
});

socket.on('close', () => {
  console.log('🔌 Disconnected from Firehose');
});
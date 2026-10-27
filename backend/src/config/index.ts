import path from 'path';

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  csvOutputDir: path.resolve(process.cwd(), 'data', 'csv-output'),
  storageDir: path.resolve(process.cwd(), 'data', 'storage'),
  wamp: {
    url: process.env.WAMP_URL || 'ws://127.0.0.1:8080/ws',
    realm: process.env.WAMP_REALM || 'realm1',
    disabled: process.env.WAMP_DISABLED === 'true' || !process.env.WAMP_URL,
    topicBarcode: '/barcode',
  },
  simulation: {
    waveformSampleIntervalMs: 100, // exact 100ms Panasonic waveform sample interval
    timeStepMs: 100,
    speedMultiplier: 1.0, // default real-time, can be tuned for fast deterministic tests
  }
};

/// <reference lib="webworker" />

import { transformPixels } from './simulate';
import type { VisionMode } from './types';

interface WorkerRequest {
  requestId: number;
  pixels: Uint8ClampedArray;
  mode: VisionMode;
  severity: number;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { requestId, pixels, mode, severity = 100 } = event.data;
  try {
    const result = transformPixels(pixels, mode, severity);
    self.postMessage({ requestId, pixels: result }, { transfer: [result.buffer] });
  } catch (error) {
    self.postMessage({ requestId, error: error instanceof Error ? error.message : 'Processing failed.' });
  }
};

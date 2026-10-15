import { ColorVisionError } from './errors';
import type { VisionMode } from './types';

interface WorkerResult {
  requestId: number;
  pixels?: Uint8ClampedArray;
  error?: string;
}

export interface WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResult>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
  terminate(): void;
}

interface Pending {
  resolve(value: Uint8ClampedArray): void;
  reject(reason: ColorVisionError): void;
}

export class SimulationWorkerClient {
  private pending: Pending | null = null;
  private activeRequestId = -1;
  private disposed = false;

  constructor(private readonly worker: WorkerLike) {
    worker.onmessage = (event) => this.handleMessage(event.data);
    worker.onerror = () => this.rejectPending('The simulation worker failed.');
  }

  process(
    requestId: number,
    pixels: Uint8ClampedArray,
    mode: VisionMode,
    severity = 100,
  ): Promise<Uint8ClampedArray> {
    if (this.disposed) {
      return Promise.reject(new ColorVisionError('processing-failed', 'The simulation worker is no longer available.'));
    }
    this.rejectPending('A newer simulation request replaced this one.');
    this.activeRequestId = requestId;
    const transferablePixels = new Uint8ClampedArray(pixels);

    const promise = new Promise<Uint8ClampedArray>((resolve, reject) => {
      this.pending = { resolve, reject };
    });
    this.worker.postMessage({ requestId, pixels: transferablePixels, mode, severity }, [transferablePixels.buffer]);
    return promise;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.rejectPending('The simulation worker was disposed.');
    this.worker.terminate();
  }

  private handleMessage(result: WorkerResult): void {
    if (!this.pending || result.requestId !== this.activeRequestId) return;
    const pending = this.pending;
    this.pending = null;
    if (result.error || !result.pixels) {
      pending.reject(new ColorVisionError('processing-failed', result.error ?? 'The worker returned no pixels.'));
      return;
    }
    pending.resolve(result.pixels);
  }

  private rejectPending(message: string): void {
    if (!this.pending) return;
    const pending = this.pending;
    this.pending = null;
    pending.reject(new ColorVisionError('processing-failed', message));
  }
}

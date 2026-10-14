import { describe, expect, it } from 'vitest';
import { SimulationWorkerClient, type WorkerLike } from '../../src/features/color-vision/worker-client';

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  sent: Array<{ message: unknown; transfer: Transferable[] }> = [];
  terminated = false;

  postMessage(message: unknown, transfer: Transferable[] = []) {
    this.sent.push({ message, transfer });
  }

  terminate() {
    this.terminated = true;
  }

  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

describe('SimulationWorkerClient', () => {
  it('transfers pixels and resolves the correlated result', async () => {
    const worker = new FakeWorker();
    const client = new SimulationWorkerClient(worker);
    const pending = client.process(7, new Uint8ClampedArray([255, 0, 0, 255]), 'protanopia');

    expect(worker.sent).toHaveLength(1);
    expect(worker.sent[0]?.transfer).toHaveLength(1);
    worker.emit({ requestId: 7, pixels: new Uint8ClampedArray([144, 142, 0, 255]) });

    await expect(pending).resolves.toEqual(new Uint8ClampedArray([144, 142, 0, 255]));
  });

  it('rejects a pending request when a newer request supersedes it', async () => {
    const worker = new FakeWorker();
    const client = new SimulationWorkerClient(worker);
    const first = client.process(1, new Uint8ClampedArray(4), 'protanopia');
    const second = client.process(2, new Uint8ClampedArray(4), 'tritanopia');

    await expect(first).rejects.toMatchObject({ code: 'processing-failed' });
    worker.emit({ requestId: 2, pixels: new Uint8ClampedArray([1, 2, 3, 4]) });
    await expect(second).resolves.toEqual(new Uint8ClampedArray([1, 2, 3, 4]));
  });

  it('terminates the worker and rejects pending work on dispose', async () => {
    const worker = new FakeWorker();
    const client = new SimulationWorkerClient(worker);
    const pending = client.process(3, new Uint8ClampedArray(4), 'deuteranopia');

    client.dispose();

    await expect(pending).rejects.toMatchObject({ code: 'processing-failed' });
    expect(worker.terminated).toBe(true);
  });
});

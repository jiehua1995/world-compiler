// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: "" },
}));
vi.mock("pdfjs-dist", () => mock);
import { decodePdfPage } from "../../src/features/color-vision/pdf-io";
const file = (size = 10) =>
  ({ size, arrayBuffer: async () => new ArrayBuffer(8) }) as File;
beforeEach(() => {
  mock.getDocument.mockReset();
});
describe("PDF input lifecycle", () => {
  it("rejects oversized files before reading or creating a worker", async () => {
    await expect(decodePdfPage(file(32000001))).rejects.toMatchObject({
      code: "too-large",
    });
    expect(mock.getDocument).not.toHaveBeenCalled();
  });
  it("reports password-protected documents and destroys the loading task", async () => {
    const destroy = vi.fn(async () => {});
    mock.getDocument.mockImplementation(() => ({
      promise: Promise.reject(
        Object.assign(new Error("password"), { name: "PasswordException" }),
      ),
      destroy,
    }));
    await expect(decodePdfPage(file())).rejects.toMatchObject({
      code: "pdf-password",
    });
    expect(destroy).toHaveBeenCalledOnce();
  });
  it("rejects out-of-range pages and frees the document", async () => {
    const destroy = vi.fn(async () => {}),
      getPage = vi.fn();
    mock.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage }),
      destroy,
    });
    await expect(decodePdfPage(file(), 3)).rejects.toMatchObject({
      code: "invalid-page",
    });
    expect(getPage).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });
  it("cancels an in-flight render when reset or file replacement aborts it", async () => {
    let reject!: (reason: unknown) => void;
    const promise = new Promise<void>((_resolve, fail) => {
      reject = fail;
    });
    const cancel = vi.fn(() =>
        reject(new DOMException("Cancelled", "AbortError")),
      ),
      destroy = vi.fn(async () => {});
    const render = vi.fn(() => ({ promise, cancel }));
    mock.getDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getViewport: ({ scale }: { scale: number }) => ({
            width: 100 * scale,
            height: 50 * scale,
          }),
          render,
        }),
      }),
      destroy,
    });
    const controller = new AbortController();
    const result = decodePdfPage(file(), 1, controller.signal);
    const rejected = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.waitFor(() => expect(render).toHaveBeenCalledOnce());
    controller.abort();
    await rejected;
    expect(cancel).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });
});

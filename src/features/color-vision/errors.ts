export type ColorVisionErrorCode =
  | 'unsupported-type'
  | 'decode-failed'
  | 'invalid-dimensions'
  | 'too-large'
  | 'processing-failed'
  | 'export-failed';

export class ColorVisionError extends Error {
  constructor(
    public readonly code: ColorVisionErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ColorVisionError';
  }
}

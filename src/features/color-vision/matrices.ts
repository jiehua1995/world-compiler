import type { VisionMode } from './types';

export type ColorMatrix = readonly [
  number, number, number,
  number, number, number,
  number, number, number,
];

/**
 * Fixed sRGB approximation matrices for educational visualization.
 * They are not diagnostic models of an individual's color perception.
 */
export const simulationMatrices: Record<Exclude<VisionMode, 'original'>, ColorMatrix> = {
  protanopia: [
    0.56667, 0.43333, 0,
    0.55833, 0.44167, 0,
    0, 0.24167, 0.75833,
  ],
  deuteranopia: [
    0.625, 0.375, 0,
    0.7, 0.3, 0,
    0, 0.3, 0.7,
  ],
  tritanopia: [
    0.95, 0.05, 0,
    0, 0.43333, 0.56667,
    0, 0.475, 0.525,
  ],
  achromatopsia: [
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
    0.299, 0.587, 0.114,
  ],
};

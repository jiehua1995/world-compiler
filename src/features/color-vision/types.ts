export type VisionMode =
  | 'original'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia';

export interface Dimensions {
  width: number;
  height: number;
}

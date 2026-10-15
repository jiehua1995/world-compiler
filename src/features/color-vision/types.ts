export type VisionAxis = 'protan' | 'deutan' | 'tritan';
export type VisionMode =
  | 'original'
  | VisionAxis
  | 'achromatopsia'
  | 'blue-cone-monochromacy'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia';

export interface Dimensions {
  width: number;
  height: number;
}

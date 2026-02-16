declare module "troika-three-text" {
  export function getTextRenderInfo(
    args: { text: string; font?: string; fontSize?: number },
    onComplete: (info: {
      blockBounds: [number, number, number, number];
    }) => void,
  ): void;
}

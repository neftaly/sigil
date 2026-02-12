declare module "troika-three-text" {
  export function getTextRenderInfo(
    args: { text: string; font?: string; fontSize?: number },
    callback: (info: {
      blockBounds: [number, number, number, number];
    }) => void,
  ): void;
}

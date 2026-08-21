declare module "heic-convert" {
  interface HeicConvertOptions {
    buffer: ArrayBuffer;
    format: "JPEG" | "PNG";
    quality?: number;
  }
  function heicConvert(options: HeicConvertOptions): Promise<ArrayBuffer>;
  export default heicConvert;
}

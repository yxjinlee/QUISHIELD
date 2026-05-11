import jsQR from 'jsqr';
import { Jimp } from 'jimp';

export async function extractUrlFromImage(buffer: Buffer): Promise<string> {
  const image = await Jimp.read(buffer as any);
  const { data, width, height } = image.bitmap;
  
  const code = jsQR(new Uint8ClampedArray(data), width, height);
  
  if (code) {
    return code.data;
  }
  
  throw new Error('No QR code detected in the image.');
}

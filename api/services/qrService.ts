import jsQR from 'jsqr';
import { Jimp } from 'jimp';

export async function extractUrlFromImage(buffer: Buffer): Promise<string> {
  console.log(`QR Service: Received buffer of size ${buffer.length}, isBuffer: ${Buffer.isBuffer(buffer)}`);
  try {
    console.log('QR Service: Reading buffer with Jimp...');
    const image = await Jimp.read(new Uint8Array(buffer));
    console.log(`QR Service: Image loaded (${image.width}x${image.height})`);
    const { data, width, height } = image.bitmap;
    
    console.log(`QR Service: Bitmap data size: ${data.length}`);
    const code = jsQR(new Uint8ClampedArray(data), width, height);
    
    if (code) {
      console.log('QR Service: QR found!');
      return code.data;
    }
    
    console.log('QR Service: No QR found in image.');
    throw new Error('No QR code detected in the image.');
  } catch (err: any) {
    console.error('QR Service ERROR:', err.message);
    throw err;
  }
}

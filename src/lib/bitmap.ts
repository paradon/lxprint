export class BitmapData {
  img: ImageData;
  bitmap: Uint8ClampedArray;

  constructor(img: ImageData) {
    this.img = img;
    this.bitmap = new Uint8ClampedArray(img.data.length / 32);
    const dv = new DataView(img.data.buffer);
    for (let i = 0; i < this.bitmap.length; i++) {
      let byte = 0;
      for (let j = 0; j < 8; j++) {
        // console.log(dv.getUint32(i * 32 + j))
        byte = byte << 1;
        byte = byte + (dv.getUint32((i * 8 + j) * 4) ? 1 : 0);
      }
      this.bitmap[i] = byte;
    }
  }

  // This is specific to LX printers
  *generatePrintData() {
    for (let i = 0; i < this.printLength; i++) {
      const line = new Uint8Array(100);
      const dv = new DataView(line.buffer);
      dv.setUint8(0, 0x55);
      dv.setUint16(1, i);
      line.set(this.bitmap.slice(i * 96, (i + 1) * 96), 3);
      yield line;
    }
  }

  get printLength() {
    return Math.ceil(this.bitmap.length / 96);
  }
}

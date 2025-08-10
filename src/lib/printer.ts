import "core-js/proposals/array-buffer-base64";

import { BitmapData } from "./bitmap.ts";

function crc16xmodem(data: Uint8Array): number {
  return data.reduce((crc: number, x: number) => {
    crc ^= x << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    return crc & 0xffff;
  }, 0);
}

export class PrinterStatus {
  state?: string;
  battery?: number;
  noPaper?: boolean;
  charging?: boolean;
  overheat?: boolean;
  lowBatt?: boolean;
  density?: number;
  voltage?: number;
  unk1?: number;
  unk2?: number;

  constructor(
    state?: string,
    battery?: number,
    noPaper?: boolean,
    charging?: boolean,
    overheat?: boolean,
    lowBatt?: boolean,
    density?: number,
    voltage?: number,
    unk1?: number,
    unk2?: number,
  ) {
    this.state = state;
    this.battery = battery;
    this.noPaper = noPaper;
    this.charging = charging;
    this.overheat = overheat;
    this.lowBatt = lowBatt;
    this.density = density;
    this.voltage = voltage;
    this.unk1 = unk1;
    this.unk2 = unk2;
  }

  static fromMsg(state: string | undefined, msg: Uint8Array): PrinterStatus {
    const d = new DataView(msg.buffer);
    return new PrinterStatus(
      state,
      d.getUint8(2),
      !!d.getUint8(3),
      !!d.getUint8(4),
      !!d.getUint8(5),
      !!d.getUint8(6),
      d.getUint8(7),
      d.getUint16(8),
      d.getUint8(10),
      d.getUint8(11),
    );
  }
}

export class LXPrinter {
  connectionState?: string;
  dev?: BluetoothDevice;
  name?: string;
  server?: BluetoothRemoteGATTServer;
  service?: BluetoothRemoteGATTService;
  recvChar?: BluetoothRemoteGATTCharacteristic;
  sendChar?: BluetoothRemoteGATTCharacteristic;

  onDisconnected: (event: Event) => Promise<void>;
  recvHandler: (event: Event) => Promise<void>;

  status: PrinterStatus = new PrinterStatus();
  statusCallback?: (status: PrinterStatus) => void;

  connectTimeout?: number;
  error?: string;

  mac?: Uint8Array;
  authBytes?: Uint8Array;
  authCrc?: number[];

  printingImage?: BitmapData;

  constructor(statusCallback?: (status: PrinterStatus) => void) {
    this.statusCallback = statusCallback;
    this.recvHandler = async (event: Event) => await this.receiveMessage(event);
    this.onDisconnected = async (_: Event) => {
      this.error = "Disconnected";
      await this.disconnect();
    };
  }

  setStatus(status: PrinterStatus) {
    this.status = status;
    if (this.statusCallback) this.statusCallback(status);
  }

  async connect() {
    try {
      this.connectTimeout = setTimeout(() => {
        this.error = "Connection Timeout";
        this.disconnect();
      }, 30000);
      this.setStatus(new PrinterStatus("connecting"));
      this.error = undefined;
      this.dev = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "LX" }],
        optionalServices: [0xffe6],
      });
      if (!this.dev?.gatt) throw new Error("No dev");
      this.name = this.dev.name;
      this.dev.addEventListener("gattserverdisconnected", this.onDisconnected);

      this.server = await this.dev.gatt.connect();
      if (!this.server) throw new Error("No GATT server");

      for (let i = 0; i < 4; i++) {
        if (i > 2)
          throw new Error("Failed to get GATT service after 3 retries");
        try {
          await this.server.getPrimaryServices();
          this.service = await this.server.getPrimaryService(0xffe6);
          if (!this.service) throw new Error("No service");
          i = 5;
        } catch (err) {
          console.log(`Failed to get GATT service, attempt ${i + 1}: ${err}`);
        }
      }
      if (!this.service) throw new Error("No service");
      this.sendChar = await this.service.getCharacteristic(0xffe1);
      this.recvChar = await this.service.getCharacteristic(0xffe2);

      await this.recvChar.startNotifications();
      this.recvChar.addEventListener(
        "characteristicvaluechanged",
        this.recvHandler,
      );

      await this.sendChar.writeValueWithoutResponse(
        new Uint8Array([0x5a, 0x01]),
      );
    } catch (err: any) {
      this.error = "Connection Error";
      console.dir(err);
      await this.disconnect();
    }
  }

  async authStage1(msg: Uint8Array) {
    this.mac = msg.slice(4, 10);
    console.dir(this.mac);
    this.authBytes = new Uint8Array(10);
    crypto.getRandomValues(this.authBytes);
    if (!this.authBytes) return;
    if (!this.mac) return;
    this.authCrc = Array.from(this.authBytes).map((x: number): number => {
      const y = new Uint8Array(7);
      y[0] = x;
      y.set(this.mac || new Uint8Array(6), 1);
      return crc16xmodem(y);
    });

    const newMsg = new Uint8Array([0x5a, 0x0a, ...this.authBytes]);
    await this.sendChar?.writeValueWithoutResponse(newMsg);
  }

  async authStage2(_: Uint8Array) {
    // We don't bother to verify the incoming message, but it should be 0x5a0a + authCrc.map(x => x & 0xFF)

    if (!this.authCrc) throw new Error("No authCrc");
    const newMsg = new Uint8Array([
      0x5a,
      0x0b,
      ...this.authCrc.map((x) => x >> 8),
    ]);
    await this.sendChar?.writeValueWithoutResponse(newMsg);
  }

  async disconnect() {
    clearTimeout(this.connectTimeout);
    this.connectTimeout = undefined;
    try {
      console.log("Stopping notifications");
      await this.recvChar?.stopNotifications();
      this.recvChar?.removeEventListener(
        "characteristicvaluechanged",
        this.recvHandler,
      );
    } catch {
      console.log("Failed to stop notifications");
    }

    try {
      console.log("Removing disconnect handler");
      this.dev?.removeEventListener(
        "gattserverdisconnected",
        this.onDisconnected,
      );
    } catch {
      console.log("Failed to remove disconnect handler");
    }

    this.dev = undefined;
    this.name = undefined;
    this.server = undefined;
    this.service = undefined;
    this.sendChar = undefined;
    this.recvChar = undefined;
    this.mac = undefined;
    this.authBytes = undefined;
    this.authCrc = undefined;
    this.setStatus(new PrinterStatus());
  }

  async authResult(msg: Uint8Array) {
    if (msg[2] !== 1) {
      await this.disconnect();
      return;
    }
    clearTimeout(this.connectTimeout);
    this.connectTimeout = undefined;
    this.setStatus(new PrinterStatus("connected"));
  }

  async receiveMessage(event: Event) {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;
    const msg = new Uint8Array(target.value.buffer);

    if (msg[0] !== 0x5a) return;

    switch (msg[1]) {
      case 0x01:
        return await this.authStage1(msg);
      case 0x0a:
        return await this.authStage2(msg);
      case 0x0b:
        return await this.authResult(msg);
      case 0x02:
        return this.setStatus(PrinterStatus.fromMsg(this.status.state, msg));
      case 0x06:
        return await this.donePrinting(msg);
    }
  }

  async donePrinting(msg: Uint8Array) {
    const dv = new DataView(msg.buffer);
    const printlen = dv.getUint16(2);

    await this.sendChar?.writeValueWithoutResponse(
      new Uint8Array([0x5a, 0x04, printlen >> 8, printlen & 0xff, 0x01, 0x00]),
    );
  }

  async print(img: ImageData) {
    this.printingImage = new BitmapData(img);

    const msg = new Uint8Array(6);
    const dv = new DataView(msg.buffer);
    msg.set([0x5a, 0x04]);
    dv.setUint16(2, this.printingImage.printLength + 1);
    await this.sendChar?.writeValueWithoutResponse(msg);

    for (const line of this.printingImage.generatePrintData()) {
      await this.sendChar?.writeValueWithoutResponse(line);
    }

    const lastLine = new Uint8Array(100);
    lastLine.set([
      0x55,
      this.printingImage.printLength >> 8,
      this.printingImage.printLength & 0xff,
    ]);
    await this.sendChar?.writeValueWithoutResponse(lastLine);
  }
}

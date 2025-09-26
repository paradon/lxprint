import { LXPrinter } from "./lxprinter.ts";
import { YHKPrinter } from "./yhkprinter.ts";

// TODO there has to be a better way than 'any'
const _drivers: Record<string, any> = {
  lx: LXPrinter,
  yhk: YHKPrinter,
};

export function drivers(): string[] {
  return Object.keys(_drivers);
}

export async function connect(driverName: string) {
  if (!(driverName in _drivers)) throw new Error(`No driver '${driverName}'`);
  const printer = new _drivers[driverName]();
  printer.connect();
  return printer;
}

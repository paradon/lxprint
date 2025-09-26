import { use, useState } from "react";
import "core-js/proposals/array-buffer-base64";

import { type PrinterStatus } from "./lib/printer.ts";
import { drivers } from "./lib/drivers.ts";
import { PrinterContext } from "./context.tsx";
import { type LXPrinterStatus } from "./lib/lxprinter.ts";
import { type YHKPrinterStatus } from "./lib/yhkprinter.ts";

function Battery({ level, charging }: { level?: number; charging?: boolean }) {
  return (
    <>
      <svg height={12} width={30}>
        <rect
          x={0}
          y={0}
          width={25}
          height={12}
          style={{ fill: "none", strokeWidth: "2", stroke: "black" }}
        />
        <rect
          x={26}
          y={3}
          width={2}
          height={6}
          style={{ fill: "black", stroke: "none" }}
        />
        <rect
          x={1}
          y={1}
          height={10}
          width={level ? (23 * level) / 100 : 0}
          style={{
            fill: level && level > 20 ? "green" : "red",
            stroke: "none",
          }}
        />
      </svg>
      <span>{charging ? "⚡" : level}</span>
    </>
  );
}

function ConnectedState({ state }: { state?: string }) {
  switch (state) {
    case "connected":
      return "✔️";
    case "connecting":
      return "🛜";
    case "printing":
      return "🖨️";
    default:
      return "🚫";
  }
}

function DriverSelect({
  driver,
  setDriver,
}: {
  driver: string;
  setDriver: (x: string) => void;
}) {
  return (
    <select value={driver} onChange={(e) => setDriver(e.target.value)}>
      {drivers().map((x) => (
        <option value={x} key={x}>
          {x}
        </option>
      ))}
    </select>
  );
}

function ConnectButton({
  state,
  connect,
  disconnect,
}: {
  state?: string;
  connect: (driver: string) => void;
  disconnect: () => void;
}) {
  const [driver, setDriver] = useState(drivers()[0]);

  if (state && ["connected", "connecting", "printing"].includes(state))
    return (
      <div>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );

  return (
    <div>
      <DriverSelect driver={driver} setDriver={setDriver} />
      <button onClick={() => connect(driver)}>Connect</button>
    </div>
  );
}

function LXPrinter({ status }: { status: LXPrinterStatus }) {
  return (
    <>
      <div style={{ float: "left", padding: "5px" }}>
        <Battery level={status.battery} charging={status.charging} />
      </div>
      {status.noPaper ? <div>⚠️ No Paper</div> : <></>}
      {status.lowBatt ? <div>⚠️ Low Battery</div> : <></>}
      {status.overheat ? <div>⚠️ Overheat</div> : <></>}
    </>
  );
}

function YHKPrinter({ status }: { status: YHKPrinterStatus }) {
  return (
    <>
      <div style={{ float: "left", padding: "5px" }}>
        <Battery level={status.battery} />
      </div>
      <div>{status.voltage}mV</div>
    </>
  );
}

function Status({
  driver,
  status,
}: {
  driver?: string;
  status: PrinterStatus;
}) {
  switch (driver) {
    case "lx":
      return <LXPrinter status={status} />;
    case "yhk":
      return <YHKPrinter status={status} />;
    default:
      return;
  }
}

function Printer() {
  const { printer, printerStatus, errors, connect } = use(PrinterContext);

  const disconnect = async () => {
    return await printer?.disconnect();
  };

  return (
    <>
      <div style={{ padding: "10px" }}>
        <div style={{ padding: "5px", float: "right" }}>
          <ConnectButton
            state={printerStatus?.state}
            connect={connect}
            disconnect={disconnect}
          />
        </div>
        <div style={{ padding: "5px", width: "100%", textAlign: "left" }}>
          <ConnectedState state={printerStatus.state} />
          {printer?.name || "No Printer"}
        </div>
        <Status driver={printer?.driverName} status={printerStatus} />
        {errors.map((x) => (
          <div>⚠️ {x}</div>
        ))}
      </div>
    </>
  );
}

export default Printer;

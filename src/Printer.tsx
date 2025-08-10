import { use } from "react";
import "core-js/proposals/array-buffer-base64";

import { PrinterContext } from "./context.tsx";

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

function ConnectButton({
  state,
  connect,
  disconnect,
}: {
  state?: string;
  connect: () => void;
  disconnect: () => void;
}) {
  if (state && ["connected", "connecting", "printing"].includes(state))
    return <button onClick={disconnect}>Disconnect</button>;

  return <button onClick={connect}>Connect</button>;
}

function Printer() {
  const { printer, printerStatus } = use(PrinterContext);

  const connect = async () => {
    return await printer.connect();
  };

  const disconnect = async () => {
    return await printer.disconnect();
  };

  return (
    <>
      <div style={{ padding: "10px" }}>
        <div style={{ float: "left", padding: "5px" }}>
          <Battery
            level={printerStatus.battery}
            charging={printerStatus.charging}
          />
        </div>
        <div style={{ padding: "5px", float: "right" }}>
          <ConnectButton
            state={printerStatus.state}
            connect={connect}
            disconnect={disconnect}
          />
        </div>
        <div style={{ padding: "5px", width: "100%", textAlign: "left" }}>
          <ConnectedState state={printerStatus.state} />
          {printer.name || "No Printer"}
        </div>
        {printer.error ? <div>⚠️ {printer.error}</div> : <></>}
        {printerStatus.noPaper ? <div>⚠️ No Paper</div> : <></>}
        {printerStatus.lowBatt ? <div>⚠️ Low Battery</div> : <></>}
        {printerStatus.overheat ? <div>⚠️ Overheat</div> : <></>}
      </div>
    </>
  );
}

export default Printer;

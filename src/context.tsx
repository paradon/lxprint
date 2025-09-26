import {
  createContext,
  useState,
  // type Dispatch,
  // type SetStateAction,
} from "react";
import {
  Printer,
  type PrinterStatus,
  PrinterStatusEvent,
  PrinterErrorEvent,
} from "./lib/printer.ts";
import { connect } from "./lib/drivers.ts";

export type PrinterContextType = {
  printer?: Printer;
  // setPrinter: Dispatch<SetStateAction<Printer | undefined>>;
  printerStatus: PrinterStatus;
  // setPrinterStatus: Dispatch<SetStateAction<PrinterStatus | undefined>>;
  connect: (driver: string) => Promise<Printer>;
  errors: string[];
};

export const PrinterContext = createContext<PrinterContextType>(
  {} as PrinterContextType,
);

export const PrinterContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({
    state: "disconnected",
  });
  const [printer, setPrinter] = useState<Printer>();
  const [errors, setErrors] = useState<string[]>([]);

  const connectPrinter = async (driver: string) => {
    setErrors([]);
    const prn: Printer = await connect(driver);
    prn.addEventListener("status", (e) =>
      setPrinterStatus((e as PrinterStatusEvent<PrinterStatus>).status),
    );
    prn.addEventListener("error", (e) =>
      setErrors([...errors, (e as PrinterErrorEvent).msg]),
    );
    setPrinter(prn);
    return prn;
  };

  return (
    <PrinterContext
      value={{ printer, printerStatus, errors, connect: connectPrinter }}
    >
      {children}
    </PrinterContext>
  );
};

import { createContext, useState, type Dispatch, type SetStateAction } from "react";
import { LXPrinter, PrinterStatus } from "./lib/printer.ts";

export type PrinterContextType = {
  printer: LXPrinter;
  setPrinter: Dispatch<SetStateAction<LXPrinter>>;
  printerStatus: PrinterStatus;
  setPrinterStatus: Dispatch<SetStateAction<PrinterStatus>>;
}

export const PrinterContext = createContext<PrinterContextType>({} as PrinterContextType);

export const PrinterContextProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(new PrinterStatus())
  const [printer, setPrinter] = useState<LXPrinter>(new LXPrinter(setPrinterStatus));

  return (
    <PrinterContext value={{ printer, setPrinter, printerStatus, setPrinterStatus }}>
      {children}
    </PrinterContext>
  );
};

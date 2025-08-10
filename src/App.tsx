import './App.css'

import { PrinterContextProvider } from './context.tsx';

import Printer from './Printer'
import { LabelMaker } from './Label'

function App() {

  return (
    <PrinterContextProvider>
      <h1>Thermal Printer</h1>
      <Printer />
      <LabelMaker />
      <div id='footer'><p>Version {__APP_VERSION__}+{__COMMIT_HASH__}</p></div>
    </PrinterContextProvider>
  )
}

export default App

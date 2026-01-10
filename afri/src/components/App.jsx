import "../styles/App.css";
import { AppProvider } from "../context/AppContext";
import Viewer from "../components/Viewer";
import AnalysisPanel from "../components/AnalysisPanel";

const App = () => (
  <AppProvider>
    <div className="app__container">
      <header>
        <h1 className="app__title">AI Frontend Regression Inspector</h1>
      </header>
      <div className="main__content">
        <Viewer />
        <AnalysisPanel />
      </div>
    </div>
  </AppProvider>
);

export default App;

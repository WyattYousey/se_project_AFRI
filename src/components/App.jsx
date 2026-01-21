import { useEffect } from "react";
import "../styles/App.css";
import { AppProvider } from "../context/AppContext";
import ImageCompareViewer from "./ImageCompareViewer";
import AnalysisPanel from "./AnalysisPanel";
import AnalysisNotesModal from "./AnalysisNotesModal";

const App = () => {
  useEffect(() => {
    const preventDefaults = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("drop", preventDefaults);

    return () => {
      window.removeEventListener("dragover", preventDefaults);
      window.removeEventListener("drop", preventDefaults);
    };
  }, []);

  return (
    <AppProvider>
      <div className="app__container">
        <header>
          <h1 className="app__title">AI Frontend Regression Inspector</h1>
          <p className="app__description">
            This is an AI Frontend Regression Inspector designed to allow
            developers to compare a baseline image with a new image and show UI
            changes that have been made and how they affect the overall
            accessibility of said UI. To use it, simply upload a baseline and a
            new image showing two different UI screenshots and hit run
            inspection.
          </p>
        </header>
        <div className="main__content">
          <ImageCompareViewer />
          <AnalysisPanel />
          <AnalysisNotesModal />
        </div>
      </div>
    </AppProvider>
  );
};

export default App;

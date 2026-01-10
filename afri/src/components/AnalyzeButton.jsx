import { useAppContext } from "../context/AppContext";
import "../styles/AnalyzeButton.css";

function AnalyzeButton() {
  const { runInspection, status, baselineImage, newImage } = useAppContext();

  return (
    <button
      className="analyze-btn"
      onClick={runInspection}
      disabled={!baselineImage || !newImage || status === "analyzing"}
    >
      {status === "analyzing" ? "Analyzing..." : "Run Inspection"}
    </button>
  );
}

export default AnalyzeButton;

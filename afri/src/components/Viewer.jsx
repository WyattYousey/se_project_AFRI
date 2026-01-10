import { useAppContext } from "../context/AppContext";
import AnalyzeButton from "../components/AnalyzeButton";
import Upload from "./Upload";
import Overlay from "./Overlay";
import "../styles/Viewer.css";

const Viewer = () => {
  const { baselineImage, newImage, analysis, highlightedChange } =
    useAppContext();
  return (
    <div className="viewer__container">
      <div className="viewer__upload_container">
        <Upload type="baseline" />
        <Upload type="new" />
      </div>
      <div className="viewer__images_container">
        <div className="viewer__baseline_wrapper">
          {baselineImage && (
            <img
              className="viewer__baseline_image"
              src={baselineImage}
              alt="Baseline UI"
            />
          )}
        </div>
        <div className="viewer__new_wrapper">
          <div className="viewer__image_with_overlay">
            {newImage && (
              <img className="viewer__new_image" src={newImage} alt="New UI" />
            )}
            {analysis &&
              analysis.changes.map((change, i) => (
                <Overlay key={change.id ?? i} change={change} />
              ))}
          </div>
        </div>
      </div>
      <AnalyzeButton />
    </div>
  );
};

export default Viewer;

import { useAppContext } from "../context/AppContext";
import AnalyzeButton from "./AnalyzeButton";
import Overlay from "./Overlay";
import "../styles/ImageCompareViewer.css";

const ImageCompareViewer = () => {
  const {
    baselineImage,
    newImage,
    analysis,
    isDragging,
    setDragging,
    setBaselineImage,
    setNewImage,
  } = useAppContext();

  /* Shared file processing logic  */
  const processFile = (file, type) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      type === "baseline"
        ? setBaselineImage(reader.result)
        : setNewImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  /* Click-to-upload handler       */
  const handleFileInput = (e, type) => {
    const file = e.target.files?.[0];
    processFile(file, type);
  };

  /* Drag & Drop handlers          */
  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, type) => {
    preventDefaults(e);
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    processFile(file, type);
  };

  /* Reusable Drop Zone renderer   */

  const renderDropZone = ({ type, image, withOverlay }) => {
    const inputId = `upload-${type}`;

    return (
      <div
        className={`viewer__drop_zone ${isDragging ? "dragging" : ""}`}
        onClick={() => document.getElementById(inputId).click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => handleDrop(e, type)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            document.getElementById(inputId).click();
          }
        }}
      >
        {/* Hidden input */}
        <input
          id={inputId}
          type="file"
          accept="image/png, image/jpeg"
          className="drop_zone__input"
          onChange={(e) => handleFileInput(e, type)}
        />

        {/* Empty state */}
        {!image && (
          <div className="drop_zone__placeholder">
            <p className="drop_zone__title">
              {type === "baseline" ? "Baseline Image" : "New Image"}
            </p>
            <p className="drop_zone__hint">
              Click to upload or drag & drop an image
            </p>
          </div>
        )}

        {/* Image */}
        {image && !withOverlay && (
          <img
            className="viewer__baseline_image"
            src={image}
            alt={`${type} UI`}
          />
        )}

        {image && withOverlay && (
          <div className="viewer__image_with_overlay">
            <img className="viewer__new_image" src={image} alt={`${type} UI`} />
            {analysis &&
              analysis.changes.map((change, i) => (
                <Overlay key={change.id ?? i} change={change} />
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="viewer__container">
      <div className="viewer__upload_container">
        <div className="upload__container">Baseline Image</div>
        <div className="upload__container">New Image</div>
      </div>

      <div className="viewer__images_container">
        {renderDropZone({
          type: "baseline",
          image: baselineImage,
          withOverlay: false,
        })}

        {renderDropZone({
          type: "new",
          image: newImage,
          withOverlay: true,
        })}
      </div>

      <AnalyzeButton />
    </div>
  );
};

export default ImageCompareViewer;

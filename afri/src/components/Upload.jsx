import { useAppContext } from "../context/AppContext";
import "../styles/Upload.css";

const Upload = ({ type }) => {
  const { setBaselineImage, setNewImage, setAnalysis, setStatus } =
    useAppContext();

  function handleUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        type === "baseline"
          ? setBaselineImage(reader.result)
          : setNewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  let title = `${type.charAt(0).toUpperCase() + type.slice(1)} Image`;

  return (
    <div className="upload__container">
      <label className="upload__label">
        {title}
        <input
          accept="image/png, image/jpeg"
          onChange={handleUpload}
          type="file"
          className="upload__input"
        />
      </label>
    </div>
  );
};

export default Upload;

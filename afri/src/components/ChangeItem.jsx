import { useAppContext } from "../context/AppContext";
import notesIcon from "../assets/notes_image.svg";
import "../styles/ChangeItem.css";

const ChangeItem = ({ change }) => {
  const { highlightedChange, setHighlightedChange } = useAppContext();

  const isActive = highlightedChange === change.id;

  return (
    <div
      className={`change_items ${isActive ? "active" : ""}`}
      onMouseEnter={() => setHighlightedChange(change.id)}
      onMouseLeave={() => setHighlightedChange(null)}
    >
      {change.accessibilityNotes && (
        <img
          className="change_items__notes"
          src={notesIcon}
          alt="Icon to access accessability notes"
        />
      )}
      <h4 className="change_item__title">
        Change Summary: {change.description}
      </h4>
      <p className="change_item">UX Impact: {change.uxImpact}</p>
      <p className="change_item">
        Accessibility Impact: {change.accessibilityImpact}
      </p>
      <p className="change_item">
        Confidence: {(change.confidence * 100).toFixed(0)}%
      </p>
    </div>
  );
};

export default ChangeItem;

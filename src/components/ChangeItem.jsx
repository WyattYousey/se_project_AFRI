import { useAppContext } from "../context/AppContext";
import notesIcon from "../assets/notes_image.svg";
import "../styles/ChangeItem.css";

const ChangeItem = ({ change }) => {
  const {
    highlightedChange,
    setHighlightedChange,
    openNotesModal,
    setActiveChangeId,
  } = useAppContext();

  const isActive = highlightedChange === change.id;
  const impactClass = change.accessibilityImpact
    ? `impact-${String(change.accessibilityImpact).toLowerCase()}`
    : "";

  return (
    <div
      className={`change_items ${isActive ? "active" : ""} ${impactClass}`}
      onMouseEnter={() => setHighlightedChange(change.id)}
      onMouseLeave={() => setHighlightedChange(null)}
    >
      {change.accessibilityNotes && (
        <img
          className="change_items__notes"
          src={notesIcon}
          alt="Icon to access accessibility notes"
          onClick={() => {
            (openNotesModal(), setActiveChangeId(change.id));
          }}
        />
      )}
      <h2 className="change_item__title">Change: {change.label}</h2>
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

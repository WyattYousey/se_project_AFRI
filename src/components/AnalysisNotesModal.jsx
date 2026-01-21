import { useAppContext } from "../context/AppContext";
import "../styles/AnalysisNotesModal.css";

const AnalysisNotesModal = () => {
  const { activeChange, setActiveChangeId, isNotesModalOpen, closeNotesModal } =
    useAppContext();

  if (!isNotesModalOpen) return null;

  return (
    <div
      className="analysis_modal_background"
      onClick={() => {
        closeNotesModal();
        setActiveChangeId(null);
      }}
    >
      <div className="analysis_modal">
        <button
          className="analysis_modal__close_btn"
          onClick={() => {
            closeNotesModal();
            setActiveChangeId(null);
          }}
        >
          <svg
            width="30px"
            height="30px"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h3 className="analysis_modal__title">~Analysis Notes~</h3>
        <p className="analysis_modal__accessibility_note">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
          {/* Accessibility Notes: {activeChange?.accessibilityNotes} */}
        </p>
        <p className="analysis_modal__recommended_fixes">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
          {/* Recommended Fixes: {activeChange?.recommendedFixes} */}
        </p>
      </div>
    </div>
  );
};

export default AnalysisNotesModal;

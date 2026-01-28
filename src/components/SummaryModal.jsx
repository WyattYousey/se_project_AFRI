import { useAppContext } from "../context/AppContext";
import "../styles/SummaryModal.css";

const SummaryModal = () => {
  const { analysis, activeModal, closeActiveModal } = useAppContext();

  const summary = analysis?.summary;

  if (activeModal !== "summary") return null;

  return (
    <div
      className="summary_modal_background"
      onClick={() => {
        closeActiveModal();
      }}
    >
      <div className="summary_modal">
        <button
          className="summary_modal__close_btn"
          onClick={() => {
            closeActiveModal();
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
        <h4 className="summary_modal__title">~Full Summary~</h4>
        <div className="summary_modal__change_details">
          <div className="change__wrapper">
            <p className="summary_modal__overall_risk">
              Overall Risk: {summary?.overallRisk}
            </p>
            <p className="summary_modal__total_changes">
              Total Changes: {summary?.totalChanges}
            </p>
            <ul className="summary_modal__top_changes">
              <p className="summary_modal_changes_title">Top 3 Changes:</p>
              <li className="top_change">
                <span className="change__label">
                  Change #1: {summary?.topChanges[0]?.label}
                </span>
                <span className="change__impact">
                  Impact: {summary?.topChanges[0]?.impact}
                </span>
                <span className="change__confidence">
                  Confidence: {summary?.topChanges[0]?.confidence * 100}%
                </span>
              </li>
              <li className="top_change">
                <span className="change__label">
                  Change #2: {summary?.topChanges[1]?.label}
                </span>
                <span className="change__impact">
                  Impact: {summary?.topChanges[1]?.impact}
                </span>
                <span className="change__confidence">
                  Confidence: {summary?.topChanges[1]?.confidence * 100}%
                </span>
              </li>
              <li className="top_change">
                <span className="change__label">
                  Change #3: {summary?.topChanges[2]?.label}
                </span>
                <span className="change__impact">
                  Impact: {summary?.topChanges[2]?.impact}
                </span>
                <span className="change__confidence">
                  Confidence: {summary?.topChanges[2]?.confidence * 100}%
                </span>
              </li>
            </ul>
          </div>
          <div className="summary__wrapper">
            <p className="summary_modal__summary_text">
              Full Summary Breakdown: {summary?.summaryText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;

import { useAppContext } from "../context/AppContext";
import ChangeItem from "./ChangeItem";
import "../styles/AnalysisPanel.css";

const AnalysisPanel = () => {
  const { changes, status } = useAppContext();

  if (status === "idle") return null;
  if (status === "analyzing")
    return <div className="analysis_panel_type_message">Analyzing…</div>;
  if (status === "error")
    return (
      <div className="analysis_panel_type_message">Error analyzing images</div>
    );

  return (
    <div className="analysis_panel">
      {changes?.map((change, i) => (
        <ChangeItem key={change.id ?? i} change={change} />
      ))}
    </div>
  );
};

export default AnalysisPanel;

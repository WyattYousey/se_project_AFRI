import { useAppContext } from '../context/useAppContext';
import ChangeItem from './ChangeItem';
import '../styles/AnalysisPanel.css';

const AnalysisPanel = () => {
    const { changes, status } = useAppContext();

    const setLoadText = (status) => {
        if (status === 'idle')
            return (
                <div className="analysis_panel_type_message">
                    Upload Content and hit the Run Inspection button to fetch
                    results.
                </div>
            );
        if (status === 'analyzing')
            return (
                <div className="analysis_panel_type_message">Analyzing…</div>
            );
        if (status === 'error')
            return (
                <div className="analysis_panel_type_message">
                    Error analyzing images
                </div>
            );
    };

    return (
        <div className="analysis_panel__container">
            <h2 className="analysis_panel__title">AI Findings</h2>
            <div className="grid__wrapper">
                {setLoadText(status)}
                {changes?.map((change, i) => (
                    <ChangeItem
                        className="analysis_panel"
                        key={change.id ?? i}
                        change={change}
                    />
                ))}
            </div>
        </div>
    );
};

export default AnalysisPanel;

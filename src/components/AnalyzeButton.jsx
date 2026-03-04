import { useAppContext } from '../context/useAppContext';
import '../styles/AnalyzeButton.css';

function AnalyzeButton() {
    const { runInspection, status, baselineImage, newImage } = useAppContext();

    return (
        <button
            className="analyze-btn_primary"
            onClick={runInspection}
            disabled={!baselineImage || !newImage || status === 'analyzing'}
        >
            {status === 'analyzing' ? 'Analyzing...' : 'Run Inspection'}
        </button>
    );
}

export default AnalyzeButton;

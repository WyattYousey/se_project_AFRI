import { useEffect } from 'react';
import { useAppContext } from '../context/useAppContext';
import '../styles/AnalysisNotesModal.css';

const AnalysisNotesModal = () => {
    const { activeChange, setActiveChangeId, changes, status } =
        useAppContext();

    // Initialize activeChange on mount or when changes update
    useEffect(() => {
        if (activeChange === undefined && changes.length > 0) {
            setActiveChangeId(changes[0]?.id);
        }
    }, [changes, activeChange, setActiveChangeId]);

    const setLoadText = (type) => {
        if (status === 'idle' && type === 'label') {
            return <li className="change_details_type">Type: pending...</li>;
        } else if (status === 'complete' && type === 'label') {
            return (
                <li className="change_details_type">
                    Type: {activeChange?.label}
                </li>
            );
        } else if (status === 'analyzing' && type === 'label') {
            return (
                <li className="change_details_type">
                    Type: Analyzing each changes type...
                </li>
            );
        }

        if (status === 'idle' && type === 'uxImpact') {
            return (
                <li className="change_details_severity">
                    Severity: pending...
                </li>
            );
        } else if (status === 'complete' && type === 'uxImpact') {
            return (
                <li className="change_details_severity">
                    Severity: {activeChange?.uxImpact}
                </li>
            );
        } else if (status === 'analyzing' && type === 'uxImpact') {
            return (
                <li className="change_details_severity">
                    Severity: Assessing the severity of changes...
                </li>
            );
        }

        if (status === 'idle' && type === 'confidence') {
            return (
                <li className="change_details_confidence">
                    Confidence: pending...
                </li>
            );
        } else if (status === 'complete' && type === 'confidence') {
            return (
                <li className="change_details_confidence">
                    Confidence: {activeChange?.confidence * 100}%
                </li>
            );
        } else if (status === 'analyzing' && type === 'confidence') {
            return (
                <li className="change_details_confidence">
                    Confidence: Adjusting confidence levels...
                </li>
            );
        }

        if (status === 'idle' && type === 'description') {
            return (
                <p className="analysis">
                    No analysis yet! Try uploading some screenshots of UI before
                    and after recent changes to get results!
                </p>
            );
        } else if (status === 'complete' && type === 'description') {
            return <p className="analysis">{activeChange?.description}</p>;
        } else if (status === 'analyzing' && type === 'description') {
            return (
                <p className="analysis">
                    Fetching individual change assessments...
                </p>
            );
        }

        if (status === 'idle' && type === 'mobileImpact') {
            return <p className="analysis">No data</p>;
        } else if (status === 'complete' && type === 'mobileImpact') {
            return (
                <div className="mobile_impact_wrapper">
                    <svg
                        width="40px"
                        height="40px"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M9 2C9 1.44772 9.44772 1 10 1H14C14.5523 1 15 1.44772 15 2V3C15 3.55228 14.5523 4 14 4H10C9.44772 4 9 3.55228 9 3V2Z"
                            fill={getMobileImpactColor(
                                activeChange?.mobileImpact
                            )}
                        />
                        <rect
                            x="5.75"
                            y="1.75"
                            width="12.5"
                            height="20.5"
                            rx="1.75"
                            stroke={getMobileImpactColor(
                                activeChange?.mobileImpact
                            )}
                            strokeWidth={1.5}
                        />
                        <path
                            d="M9 19.5H15"
                            stroke={getMobileImpactColor(
                                activeChange?.mobileImpact
                            )}
                            strokeWidth={1.5}
                            strokeLinecap="round"
                        />
                    </svg>
                    <p className="mobile_impact">
                        {activeChange?.mobileImpact}
                    </p>
                </div>
            );
        } else if (status === 'analyzing' && type === 'mobileImpact') {
            return <p className="mobile_impact">Testing mobile features...</p>;
        }
        if (status === 'error')
            return (
                <div className="analysis_panel_type_message">
                    Error analyzing images
                </div>
            );
    };

    const getMobileImpactColor = (mobileImpact) => {
        if (mobileImpact === 'High') return '#ef4444'; // red
        if (mobileImpact === 'Medium') return '#f59e0b'; // amber
        if (mobileImpact === 'Low') return '#10b981'; // green
        return 'transparent';
    };
    return (
        <div className="analysis_modal">
            <h3 className="analysis_modal__title">Inspector</h3>
            <div className="change_details_container">
                <p className="change_details_title">Change Details</p>
                <ul className="change_details_list">
                    {setLoadText('label')}
                    {setLoadText('uxImpact')}
                    {setLoadText('confidence')}
                </ul>
                <div className="analysis_container">
                    <p className="analysis_title">Analysis Description</p>
                    {setLoadText('description')}
                </div>
            </div>
            {activeChange?.recommendedFixes ? (
                <div className="recommended_fix_container">
                    <p className="recommended_fix_title">Recommended Fix</p>
                    <p className="recommended_fix">
                        {activeChange?.recommendedFixes}
                    </p>
                </div>
            ) : (
                <></>
            )}
            {activeChange?.accessibilityNotes ? (
                <div className="accessibility_notes_container">
                    <p className="accessibility_notes_title">
                        Accessibility Notes
                    </p>
                    <p className="accessibility_notes">
                        {activeChange?.accessibilityNotes}
                    </p>
                </div>
            ) : (
                <></>
            )}
            <div className="mobile_impact_container">
                <p className="mobile_impact_title">Mobile Impact</p>
                {setLoadText('mobileImpact')}
            </div>
        </div>
    );
};

export default AnalysisNotesModal;

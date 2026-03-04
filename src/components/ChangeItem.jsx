import { useAppContext } from '../context/useAppContext';
import '../styles/ChangeItem.css';

const ChangeItem = ({ change }) => {
    const {
        highlightedChange,
        setHighlightedChange,
        openActiveModal,
        setActiveChangeId,
    } = useAppContext();

    const isActive = highlightedChange === change.id;
    const impactClass = change.accessibilityImpact
        ? `impact-${String(change.accessibilityImpact).toLowerCase()}`
        : '';

    const setImpact = (impactClass) => {
        if (impactClass === 'impact-high') {
            return <p className="change_item__impact_high">High</p>;
        } else if (impactClass === 'impact-medium') {
            return <p className="change_item__impact_medium">Medium</p>;
        } else if (impactClass === 'impact-low') {
            return <p className="change_item__impact_low">Low</p>;
        } else {
            return <p className="change_item__impact">None</p>;
        }
    };

    return (
        <div
            className={`change_items ${isActive ? 'active' : ''} ${impactClass}`}
            onMouseEnter={() => setHighlightedChange(change.id)}
            onMouseLeave={() => setHighlightedChange(null)}
            onClick={() => {
                // Set this change as active and open the analysis modal
                setActiveChangeId(change.id);
                openActiveModal('analysis');
            }}
        >
            <div className="change_item__info">
                {setImpact(impactClass)}
                <p className="change_item__title">{change.label}</p>
                <p className="change_item_impacts">
                    UX: {change.uxImpact} - Accessibility:{' '}
                    {change.accessibilityImpact}
                </p>
                <p className="change_item">
                    Confidence: {(change.confidence * 100).toFixed(0)}%
                </p>
            </div>
        </div>
    );
};

export default ChangeItem;

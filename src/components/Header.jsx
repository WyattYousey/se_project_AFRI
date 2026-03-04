import { useAppContext } from '../context/useAppContext';
import { PDFDownloadLink } from '@react-pdf/renderer';
import '../styles/Header.css';
import logoImage from '../assets/ai-logo_image.svg';
import MyDocument from './MyDocument';

const Header = () => {
    const { changes } = useAppContext();

    return (
        <div className="header__container">
            <div className="header__logo_container">
                <img
                    className="header__logo_image"
                    src={logoImage}
                    alt="Logo Image"
                />
                <h1 className="header__logo">
                    AI Frontend Regression Inspector
                </h1>
            </div>
            <div className="header__btns">
                <PDFDownloadLink
                    className="header__btn_primary"
                    document={<MyDocument data={changes} />}
                    fileName="analysis_report.pdf"
                >
                    {({ loading }) =>
                        loading ? 'Loading document...' : 'Download PDF'
                    }
                </PDFDownloadLink>
            </div>
        </div>
    );
};

export default Header;

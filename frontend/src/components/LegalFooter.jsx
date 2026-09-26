import { Link } from 'react-router-dom';

export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <span>SyncBoard</span>
      <nav aria-label="Legal links">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/cookies">Cookies</Link>
        <Link to="/refunds">Refunds</Link>
      </nav>
    </footer>
  );
}

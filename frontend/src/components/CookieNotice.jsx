import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_NOTICE_KEY = 'syncboard-essential-storage-notice';

export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(COOKIE_NOTICE_KEY) !== 'acknowledged');
  }, []);

  if (!visible) return null;

  const acknowledge = () => {
    window.localStorage.setItem(COOKIE_NOTICE_KEY, 'acknowledged');
    setVisible(false);
  };

  return (
    <aside className="cookie-notice" aria-label="Cookie and local storage notice">
      <p>
        SyncBoard uses essential browser storage for sign-in and your display preferences. It does not load analytics or advertising trackers.
        {' '}Read the <Link to="/cookies">Cookie Policy</Link>.
      </p>
      <button type="button" onClick={acknowledge}>Continue with essential storage</button>
    </aside>
  );
}

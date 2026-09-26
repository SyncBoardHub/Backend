import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, ListChecks, UsersRound } from 'lucide-react';
import LegalFooter from '../components/LegalFooter';

const capabilities = [
  { icon: ListChecks, title: 'Clear ownership', description: 'Turn a project brief into named tasks with a visible status and due date.' },
  { icon: CalendarDays, title: 'Deadline awareness', description: 'Keep work moving before the final week by making the next deadline easy to find.' },
  { icon: UsersRound, title: 'One shared record', description: 'Keep tasks, notes, files, and project context with the team instead of across chats.' },
];

export default function LandingPage({ session }) {
  const navigate = useNavigate();
  const primaryDestination = session ? '/dashboard' : '/login';

  return (
    <div className="marketing-page">
      <header className="marketing-nav">
        <Link className="marketing-brand" to="/">SyncBoard</Link>
        <nav aria-label="Primary navigation">
          <a className="marketing-link" href="#capabilities-title">What it covers</a>
          <Link className="marketing-button marketing-button--secondary" to="/login">Sign in</Link>
          <button className="marketing-button" type="button" onClick={() => navigate(primaryDestination)}>{session ? 'Open workspace' : 'Create workspace'}</button>
        </nav>
      </header>

      <main>
        <section className="marketing-hero" aria-labelledby="landing-title">
          <div>
            <p className="marketing-eyebrow">Project coordination for college teams</p>
            <h1 id="landing-title">Give every group project a single source of truth.</h1>
            <p className="marketing-lede">SyncBoard helps student teams decide who owns each task, see what is due, and keep project materials organised from the first meeting to submission.</p>
            <div className="marketing-actions">
              <button className="marketing-button marketing-button--large" type="button" onClick={() => navigate(primaryDestination)}>{session ? 'Open your workspace' : 'Create a workspace'} <ArrowRight aria-hidden="true" size={18} /></button>
              <Link className="marketing-button marketing-button--secondary marketing-button--large" to="/login?join=true">Join an existing team</Link>
            </div>
          </div>
          <aside className="marketing-brief" aria-label="Example project workflow">
            <p className="marketing-brief__label">This week</p>
            <h2>Research presentation</h2>
            <ul>
              <li><span className="status-dot status-dot--done" aria-hidden="true" /> Agree outline and sources</li>
              <li><span className="status-dot status-dot--active" aria-hidden="true" /> Draft slides and speaker notes</li>
              <li><span className="status-dot" aria-hidden="true" /> Review before Friday submission</li>
            </ul>
            <p className="marketing-brief__note">A practical view of work, not a score or productivity claim.</p>
          </aside>
        </section>

        <section className="marketing-capabilities" aria-labelledby="capabilities-title">
          <div className="marketing-section-heading"><p className="marketing-eyebrow">Built for real coursework</p><h2 id="capabilities-title">Keep the group focused on the work.</h2></div>
          <div className="marketing-capabilities__grid">
            {capabilities.map((capability) => <article key={capability.title} className="marketing-capability"><capability.icon aria-hidden="true" size={22} /><h3>{capability.title}</h3><p>{capability.description}</p></article>)}
          </div>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}

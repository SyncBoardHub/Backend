import { Link, useParams } from 'react-router-dom';
import LegalFooter from '../components/LegalFooter';
import { legalConfigurationComplete, legalDetails } from '../config/legal';

const policyContent = {
  privacy: {
    title: 'Privacy Policy',
    summary: 'How SyncBoard handles the personal data required to provide a college project workspace.',
    sections: [
      ['Data we process', 'We process your name, email address, account identifier, profile details you choose to provide, and the workspace content you create or upload, such as tasks, notes, files, comments, team memberships, and activity records. We also process limited technical and security logs needed to operate and protect the service.'],
      ['Why we process it', 'We use this data to create and secure accounts, run shared workspaces, show information to the teams you join, respond to support requests, prevent misuse, and meet legal obligations. We do not sell personal data or use it for advertising.'],
      ['Service providers', 'SyncBoard uses Supabase for authentication, database, and file storage. The optional planning assistant sends only the prompt and relevant workspace context to the configured AI provider when a user chooses to use it. Do not enter confidential personal data into the assistant.'],
      ['Retention and deletion', 'We retain account and workspace data while the account or workspace remains active, then delete or anonymise it within the applicable retention process unless we must keep it for a legal, security, or dispute-related reason. Workspace owners should remove files and project content they no longer need.'],
      ['Your choices and rights', 'You can update your profile in Settings. To request access, correction, deletion, or to withdraw consent where applicable, contact us using the details below. We may need to verify your identity before completing a request.'],
      ['Security and international processing', 'We use reasonable technical and organisational safeguards, but no online service can guarantee absolute security. Providers may process data in countries other than your own, subject to their applicable safeguards and service terms.'],
      ['Students and age', 'SyncBoard is intended for college project teams. Do not create an account for a child where local law requires parental or guardian consent.'],
    ],
  },
  terms: {
    title: 'Terms and Conditions',
    summary: 'The rules for using SyncBoard as a shared project workspace.',
    sections: [
      ['Using the service', 'You may use SyncBoard for lawful project collaboration. You are responsible for the information you add, the invitations you send, and keeping your account credentials confidential.'],
      ['Acceptable use', 'Do not use the service to break the law, infringe intellectual-property rights, upload malware, impersonate others, harass people, access another account without permission, or interfere with the service or other teams.'],
      ['Workspace content', 'You retain responsibility for the content you submit. You grant us only the limited permission needed to host, process, and display that content to you and the workspace members you authorise. Make sure you have permission to upload files, logos, images, and other material.'],
      ['Availability', 'We aim to operate SyncBoard reliably, but the service may change, be interrupted, or be unavailable. Back up important academic work outside the service before a submission deadline.'],
      ['Suspension and termination', 'We may suspend or end access where necessary to protect users, investigate misuse, comply with law, or maintain the service. You may stop using the service at any time.'],
      ['Disclaimers and liability', 'To the extent permitted by law, SyncBoard is provided on an as-is and as-available basis. It is not a substitute for your institution\'s official systems, academic advice, or a guaranteed backup service.'],
      ['Changes and contact', 'We may update these terms when the service or legal requirements change. Material changes will be posted here with a revised effective date. Contact us with questions or notices using the details below.'],
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    summary: 'The browser storage SyncBoard uses and how to control it.',
    sections: [
      ['What we use', 'SyncBoard uses essential browser storage for authentication sessions, security, and saved display preferences such as light or dark mode. These items are needed for core functionality.'],
      ['What we do not use', 'The current application does not load advertising cookies, audience measurement tools, retargeting pixels, social-media embeds, or third-party analytics trackers.'],
      ['Your controls', 'You can clear browser cookies and local storage in your browser settings. Clearing essential storage may sign you out or reset display preferences.'],
      ['Future optional tools', 'If we add analytics, advertising, or other non-essential storage, we will update this policy and ask for consent before activating those tools where required.'],
    ],
  },
  refunds: {
    title: 'Refund Policy',
    summary: 'The current payment position for SyncBoard.',
    sections: [
      ['Current service', 'SyncBoard does not currently sell paid subscriptions, process payments, or offer paid add-ons. There is therefore no refund process at this time.'],
      ['Before any paid launch', 'A paid feature will not be released until its price, billing terms, cancellation path, payment processor, tax treatment, and refund rules are published and accepted before checkout.'],
      ['Questions', 'If you believe you were charged in error, contact us using the details below and include the email address used for the account and the payment reference.'],
    ],
  },
};

function BusinessDetails() {
  if (!legalConfigurationComplete) {
    return (
      <section className="legal-warning" aria-label="Deployment information required">
        <h2>Deployment information required</h2>
        <p>Before public launch, configure the legal entity name, support email, business address, and HTTPS production domain. This preview intentionally does not invent business details.</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Contact and business details</h2>
      <p><strong>{legalDetails.entityName}</strong><br />{legalDetails.businessAddress}<br /><a href={`mailto:${legalDetails.contactEmail}`}>{legalDetails.contactEmail}</a></p>
    </section>
  );
}

export default function LegalPage({ policy: requestedPolicy }) {
  const { policy: routePolicy } = useParams();
  const policy = requestedPolicy || routePolicy || 'privacy';
  const content = policyContent[policy] || policyContent.privacy;

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link className="legal-brand" to="/">SyncBoard</Link>
        <Link className="legal-sign-in" to="/login">Sign in</Link>
      </header>
      <main className="legal-content">
        <p className="legal-eyebrow">Legal</p>
        <h1>{content.title}</h1>
        <p className="legal-summary">{content.summary}</p>
        <p className="legal-effective">Effective date: {legalDetails.effectiveDate}</p>
        {content.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
        <BusinessDetails />
      </main>
      <LegalFooter />
    </div>
  );
}

import { runtimeConfig } from '../config/runtime';

export default function BetaBanner() {
  if (!runtimeConfig.isBeta) return null;

  return (
    <aside className="beta-banner" role="status">
      <strong>Beta preview</strong>
      <span>Features may change. Keep a separate copy of deadline-critical work.</span>
    </aside>
  );
}

/**
 * Shared full-screen shell for the Chrysalis auth/profile pages. Provides the
 * calm gradient background and a centered content column. Kept separate from the
 * marketing site and the feed so these pages can own their own layout.
 */
export function CxShell({ children, wide = false, center = false }) {
  return (
    <main className={`cx-shell${center ? ' cx-shell--center' : ''}`} data-cx>
      <div className={`cx-shell__inner${wide ? ' cx-shell__inner--wide' : ''}`}>
        {children}
      </div>
    </main>
  );
}

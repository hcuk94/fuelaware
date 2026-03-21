export default function NotFound() {
  return (
    <main className="main-grid">
      <section className="card stack empty-state">
        <span className="eyebrow">Page not found</span>
        <h1>That route does not exist in FuelAware.</h1>
        <p className="muted body-copy">
          The page may have moved, the station may no longer be available, or the address may have been typed incorrectly.
        </p>
        <a href="/" className="link-button">
          Return to dashboard
        </a>
      </section>
    </main>
  );
}

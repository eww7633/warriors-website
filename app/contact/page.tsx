export default function ContactPage() {
  return (
    <section className="stack">
      <article className="card">
        <p className="eyebrow">Contact</p>
        <h1>Contact Pittsburgh Warriors Hockey Club</h1>
        <p className="hero-lead">
          Questions about joining, volunteering, sponsoring, media coverage, or team operations can be sent directly
          to Hockey Ops.
        </p>
        <div className="stack">
          <p>
            <strong>Email:</strong> <a href="mailto:ops@pghwarriorhockey.org">ops@pghwarriorhockey.org</a>
          </p>
          <p>
            <strong>Instagram:</strong>{" "}
            <a href="https://instagram.com/pittsburghwarriorshockey" target="_blank" rel="noreferrer">
              @pittsburghwarriorshockey
            </a>
          </p>
          <p>
            <strong>Facebook:</strong>{" "}
            <a href="https://www.facebook.com/pittsburghwarriors/" target="_blank" rel="noreferrer">
              Pittsburgh Warriors Hockey
            </a>
          </p>
        </div>
      </article>
    </section>
  );
}

import { useState } from "react";
import { useReveal } from "./Reveal";

export default function CtaBanner() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const revealRef = useReveal();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
      setEmail("");
    }
  };

  return (
    <section className="tuf-cta-section" ref={revealRef}>
      <div className="tuf-container">
        <div className="tuf-cta-card" data-reveal>
          <h2 className="tuf-cta-title">Ship your next sprint together</h2>
          <p className="tuf-cta-desc">
            Start a project, invite your team, and see your first board update live in under a minute.
          </p>

          <form className="tuf-cta-form" onSubmit={handleSubmit}>
            <input
              type="email"
              required
              placeholder="Enter Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="tuf-cta-input"
              aria-label="Your email address"
            />
            <button type="submit" className="tuf-cta-submit">
              Subscribe
            </button>
          </form>

          {submitted && (
            <div className="tuf-cta-feedback">
              ✓ Thank you! Check your inbox to confirm, and we will keep you posted on new features and templates.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

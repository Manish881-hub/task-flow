import Link from "next/link";

const TESTIMONIALS = [
  {
    quote:
      "We replaced status meetings with the board. Everyone sees the same live picture, and the activity feed answers 'what changed?' before anyone asks.",
    author: "Aarav Mehta",
    role: "Engineering Lead, Platform Team",
    initials: "AM",
  },
  {
    quote:
      "Drag a card, add a comment, assign it — done. TaskFlow is the first board my designers actually open every morning without being asked.",
    author: "Sara Thomas",
    role: "Product Designer",
    initials: "ST",
  },
  {
    quote:
      "Invited the whole crew by email in minutes. Owners, members, assigned queues — the roles match exactly how our small team already works.",
    author: "Rohan Patel",
    role: "Founder, SaaS Startup",
    initials: "RP",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="tuf-testimonials-section" id="testimonials">
      <div className="tuf-container">
        <div className="tuf-testimonials-header">
          <div>
            <div className="tuf-section-tag">
              <span className="tuf-section-tag-dot" />
              <span>Testimonials</span>
            </div>
            <h2 className="tuf-section-title">
              Built for teams
              <br />
              that ship together
            </h2>
          </div>

          <div className="tuf-testimonials-right">
            <span className="tuf-testimonials-sub">Hear from teams organizing work</span>
            <Link href="/signup" className="tuf-btn-primary">
              Start your story
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="tuf-testimonials-grid">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="tuf-testimonial-card">
              <p className="tuf-testimonial-quote">“{t.quote}”</p>
              <div className="tuf-testimonial-author">
                <div className="tuf-author-avatar">{t.initials}</div>
                <div>
                  <div className="tuf-author-name">{t.author}</div>
                  <div className="tuf-author-title">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="tuf-footer">
      <div className="tuf-container">
        <div className="tuf-footer-grid">
          {/* Brand Column */}
          <div className="tuf-footer-brand-col">
            <Link href="/" className="tuf-logo">
              <img
                src="/logo.png"
                alt="Logo"
                className="tuf-logo-img"
                width={34}
                height={34}
              />
              <span className="tuf-logo-text">
                TaskFlow
              </span>
            </Link>
            <p>
              Collaborative task boards with real-time sync — plan the work, share the load, ship together.
            </p>
          </div>

          {/* Links Column: Product */}
          <div>
            <div className="tuf-footer-col-title">Product</div>
            <ul className="tuf-footer-links">
              <li><Link href="/dashboard" className="tuf-footer-link">Dashboard</Link></li>
              <li><Link href="/assigned" className="tuf-footer-link">Assigned to me</Link></li>
              <li><Link href="/signup" className="tuf-footer-link">Get started</Link></li>
              <li><Link href="/login" className="tuf-footer-link">Log in</Link></li>
            </ul>
          </div>

          {/* Links Column: Resources */}
          <div>
            <div className="tuf-footer-col-title">Resources</div>
            <ul className="tuf-footer-links">
              <li><Link href="#features" className="tuf-footer-link">Features</Link></li>
              <li><Link href="#testimonials" className="tuf-footer-link">Teams</Link></li>
              <li><Link href="#faq" className="tuf-footer-link">FAQ</Link></li>
            </ul>
          </div>

          {/* Links Column: Legal */}
          <div>
            <div className="tuf-footer-col-title">Legal</div>
            <ul className="tuf-footer-links">
              <li><Link href="#terms" className="tuf-footer-link">Terms</Link></li>
              <li><Link href="#privacy" className="tuf-footer-link">Privacy</Link></li>
              <li><Link href="#help" className="tuf-footer-link">Help</Link></li>
            </ul>
          </div>

          {/* Links Column: The Cool */}
          <div>
            <div className="tuf-footer-col-title">The Cool</div>
            <ul className="tuf-footer-links">
              <li><a href="https://x.com" target="_blank" rel="noopener noreferrer" className="tuf-footer-link">X</a></li>
              <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="tuf-footer-link">Instagram</a></li>
            </ul>
            <div className="tuf-footer-socials">
              {/* Facebook Icon */}
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="tuf-social-icon" aria-label="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
                </svg>
              </a>
              {/* Twitter/X Icon */}
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="tuf-social-icon" aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom Legal Bar */}
        <div className="tuf-footer-bottom">
          <div>© 2026 TaskFlow. All rights reserved.</div>
          <div className="tuf-footer-legal-links">
            <Link href="#privacy">Privacy Policy</Link>
            <Link href="#terms">Terms of Service</Link>
            <Link href="#cookies">Cookie Policy</Link>
          </div>
        </div>
      </div>

      {/* Large Decorative Watermark Text */}
      <div className="tuf-footer-watermark" aria-hidden="true">
        TaskFlow
      </div>
    </footer>
  );
}

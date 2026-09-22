import { useState } from "react";

const FAQ_ITEMS = [
  {
    question: "What is TaskFlow?",
    answer:
      "TaskFlow is a collaborative task board. You create projects, invite teammates, manage work on drag-and-drop boards, and see every change live through WebSockets — no refresh needed.",
  },
  {
    question: "How does real-time collaboration work?",
    answer:
      "Each project has its own live room. When anyone creates, moves, or comments on a task, every teammate viewing that project gets the update instantly, with automatic reconnect if the connection drops.",
  },
  {
    question: "How do teams and invites work?",
    answer:
      "Invite anyone by email. Project owners can manage members while members collaborate on tasks. Everyone gets an Assigned-to-me queue showing their work across all projects.",
  },
  {
    question: "Is TaskFlow free to start?",
    answer:
      "Yes! Sign up with just a name, email, and password, create your first project, and invite your team. No credit card, no setup calls.",
  },
  {
    question: "Do teammates need an account to join my project?",
    answer:
      "They sign up in under a minute and you invite them by email. Once added, your shared boards, tasks, and activity appear for them immediately.",
  },
  {
    question: "What happens to my tasks and comments if someone leaves?",
    answer:
      "History is preserved. Removing a member unassigns their open tasks but keeps everything they created and every comment — nothing silently disappears.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0); // first item open by default

  const toggle = (idx) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section className="tuf-faq-section" id="faq">
      <div className="tuf-container">
        <div className="tuf-faq-grid">
          {/* Left Column */}
          <div className="tuf-faq-left">
            <div className="tuf-section-tag">
              <span className="tuf-section-tag-dot" />
              <span>FAQ</span>
            </div>
            <h2 className="tuf-section-title">
              Frequently Asked
              <br />
              questions
            </h2>
            <p>Find your starting point and learn how to make the most of TaskFlow.</p>
            <a href="mailto:support@taskflow.app" className="tuf-btn-primary">
              Contact Us
            </a>
          </div>

          {/* Right Column: Accordion */}
          <div className="tuf-faq-list">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx} className="tuf-faq-item">
                  <button
                    type="button"
                    className="tuf-faq-trigger"
                    onClick={() => toggle(idx)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <span className="tuf-faq-icon">{isOpen ? "×" : "+"}</span>
                  </button>
                  {isOpen && <div className="tuf-faq-answer">{item.answer}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

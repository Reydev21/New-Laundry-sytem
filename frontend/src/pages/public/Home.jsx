import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getServices } from "../../services/serviceService";

const IconBasket = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 9h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z" />
    <path d="M8.5 9 10 4m5.5 5L14 4M9.5 13v3.5m5-3.5v3.5" />
  </svg>
);

const IconTruck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h11v9H3zM14 9h3.5l2.5 3v3H14z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17.5" cy="18" r="1.6" />
  </svg>
);

const IconSparkle = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3.5c.6 3.4 1.6 4.4 5 5-3.4.6-4.4 1.6-5 5-.6-3.4-1.6-4.4-5-5 3.4-.6 4.4-1.6 5-5Z" />
    <path d="M18.5 14c.3 1.5.8 2 2.3 2.3-1.5.3-2 .8-2.3 2.3-.3-1.5-.8-2-2.3-2.3 1.5-.3 2-.8 2.3-2.3Z" />
  </svg>
);

const IconShield = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const IconBell = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6.5 16V11a5.5 5.5 0 0 1 11 0v5l1.5 2.5H5Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

const steps = [
  {
    icon: IconBasket,
    title: "Book in seconds",
    text: "Choose a service, set your weight and pay online with GCash, Maya or bank transfer.",
  },
  {
    icon: IconSparkle,
    title: "We handle the wash",
    text: "Follow washing, drying and folding in real time — no need to call the shop.",
  },
  {
    icon: IconTruck,
    title: "Pick up when ready",
    text: "Get notified the moment your clothes are clean, folded and ready for pickup.",
  },
];

export default function Home() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    getServices()
      .then((all) => setServices((all || []).filter((s) => s.status === "active").slice(0, 3)))
      .catch(() => setServices([]));
  }, []);

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Laundry, handled</p>
          <h1 className="landing-title">
            Fresh clothes,
            <span> without the wait.</span>
          </h1>
          <p className="landing-lede">
            Book a batch, follow every wash, and pay online — all from one simple dashboard.
            Clean clothes and clear updates, from drop-off to pickup.
          </p>
          <div className="landing-cta-row">
            <Link to="/track" className="cu-btn-primary landing-btn-lg">
              Track your laundry
            </Link>
            <Link to="/customer/login" className="landing-btn-ghost">
              Customer portal
            </Link>
          </div>
          <ul className="landing-trust">
            <li>
              <IconShield className="landing-trust-icon" />
              Secure online payments
            </li>
            <li>
              <IconBell className="landing-trust-icon" />
              Email updates per stage
            </li>
            <li>
              <IconCheck className="landing-trust-icon" />
              Live order tracking
            </li>
          </ul>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="landing-visual-card">
            <div className="landing-visual-head">
              <span className="landing-visual-number">LAUNDRY-1025</span>
              <span className="landing-visual-badge">Washing</span>
            </div>
            <div className="landing-visual-track">
              <div className="landing-visual-step is-done">
                <span className="landing-visual-dot" />
                Received
              </div>
              <div className="landing-visual-step is-done">
                <span className="landing-visual-dot" />
                Weighed &amp; tagged
              </div>
              <div className="landing-visual-step is-active">
                <span className="landing-visual-dot" />
                Washing
              </div>
              <div className="landing-visual-step">
                <span className="landing-visual-dot" />
                Ready for pickup
              </div>
            </div>
            <div className="landing-visual-foot">
              <span>3.5 kg · Colored</span>
              <strong>₱245.00</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <p className="eyebrow">How it works</p>
          <h2 className="landing-section-title">Three steps to clean, folded clothes</h2>
        </div>
        <div className="landing-steps">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <article className="landing-step-card" key={title}>
              <span className="landing-step-icon">
                <Icon />
              </span>
              <span className="landing-step-index">Step {i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {services.length > 0 && (
        <section className="landing-section">
          <div className="landing-section-head">
            <p className="eyebrow">Our services</p>
            <h2 className="landing-section-title">Simple pricing, no surprises</h2>
          </div>
          <div className="landing-services">
            {services.map((s) => (
              <article className="landing-service-card" key={s._id || s.id}>
                <h3>{s.serviceName}</h3>
                <p className="landing-service-price">
                  ₱{s.price}
                  <span> / {s.unit}</span>
                </p>
                {s.description && <p className="landing-service-desc">{s.description}</p>}
              </article>
            ))}
          </div>
          <Link to="/services" className="cu-more">
            See all services →
          </Link>
        </section>
      )}

      <section className="landing-cta-band">
        <div>
          <h2>Ready for your first clean batch?</h2>
          <p>Create an account, book a service and track it live — it only takes a minute.</p>
        </div>
        <Link to="/customer/register" className="cu-btn-primary landing-btn-lg">
          Get started
        </Link>
      </section>
    </div>
  );
}

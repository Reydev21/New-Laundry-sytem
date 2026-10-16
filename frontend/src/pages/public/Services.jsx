import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getServices } from "../../services/serviceService";

const IconBasket = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 9h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8Z" />
    <path d="M8.5 9 10 4m5.5 5L14 4M9.5 13v3.5m5-3.5v3.5" />
  </svg>
);

const IconIron = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 16h13a4 4 0 0 0 4-4l1-3H6a3 3 0 0 0-3 3Z" />
    <path d="M8 16v2m4-2v2m4-2v2" />
  </svg>
);

const IconHanger = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 8a2.5 2.5 0 1 1 2.5-2.5" />
    <path d="m12 8 8.5 6.2a1 1 0 0 1-.6 1.8H4.1a1 1 0 0 1-.6-1.8Z" />
  </svg>
);

const IconFold = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M4 12h16M12 5v14" />
  </svg>
);

const IconDrop = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 3.5c3 3.6 5.5 6.5 5.5 9.8a5.5 5.5 0 0 1-11 0c0-3.3 2.5-6.2 5.5-9.8Z" />
  </svg>
);

const pickIcon = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("dry")) return IconHanger;
  if (n.includes("press") || n.includes("iron")) return IconIron;
  if (n.includes("fold")) return IconFold;
  if (n.includes("wash")) return IconBasket;
  return IconDrop;
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServices()
      .then((all) => setServices((all || []).filter((s) => s.status === "active")))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="svc-page">
      <header className="svc-head">
        <p className="eyebrow">Our services</p>
        <h1>Laundry care, priced simply</h1>
        <p className="svc-lede">
          Every batch is weighed, sorted by color and handled with care. Pick the service that
          fits your load — no hidden fees, just clean clothes.
        </p>
      </header>

      {loading ? (
        <p className="svc-status">Loading services…</p>
      ) : services.length === 0 ? (
        <div className="svc-empty">
          <p>No services are available right now.</p>
          <p>Please check back soon — our team is updating the lineup.</p>
        </div>
      ) : (
        <div className="svc-grid">
          {services.map((s) => {
            const Icon = pickIcon(s.serviceName);
            return (
              <article className="svc-card" key={s._id || s.id}>
                <span className="svc-icon">
                  <Icon />
                </span>
                <h2 className="svc-name">{s.serviceName}</h2>
                {s.description && <p className="svc-desc">{s.description}</p>}
                <div className="svc-foot">
                  <span className="svc-price">₱{s.price}</span>
                  <span className="svc-unit">/ {s.unit}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="svc-cta">
        <p>Ready to book a batch? Create an account and schedule a pickup in a minute.</p>
        <Link to="/customer/register" className="cu-btn-primary">
          Get started
        </Link>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="track-page">
      <section className="track-intro">
        <p className="eyebrow">About us</p>
        <h1>Less paper. Cleaner workflow.</h1>
        <p className="track-lede">
          LaundriTrack is a web-based laundry order management system that helps
          laundry shops record orders, track laundry status, manage customers,
          and monitor sales in one centralized platform.
        </p>
      </section>

      <div className="order-details">
        <div className="card">
          <h3>For shop owners</h3>
          <p>Monitor orders, sales, and staff activity with a live dashboard and basic reports.</p>
        </div>
        <div className="card">
          <h3>For staff</h3>
          <p>Record orders in seconds, update statuses from Washing to Claimed, and search records instantly.</p>
        </div>
        <div className="card">
          <h3>For customers</h3>
          <p>Check the status of your laundry anytime using your order number — no need to call or message.</p>
        </div>
        <div className="card">
          <h3>How it works</h3>
          <p>Every order gets a unique order number, automatic price computation, and real-time status updates.</p>
        </div>
      </div>

      <Link to="/track" className="btn">Track Your Laundry</Link>
    </div>
  );
}

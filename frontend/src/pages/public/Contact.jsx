export default function Contact() {
  return (
    <div className="track-page">
      <section className="track-intro">
        <p className="eyebrow">Contact</p>
        <h1>Get in touch</h1>
        <p className="track-lede">
          Questions about your laundry, our services, or pickup times? Reach us
          through any of the channels below.
        </p>
      </section>

      <div className="order-details">
        <div className="card">
          <h3>Phone</h3>
          <p>(02) 8123-4567</p>
        </div>
        <div className="card">
          <h3>Email</h3>
          <p>hello@laundritrack.ph</p>
        </div>
        <div className="card">
          <h3>Address</h3>
          <p>123 Mabini Street, Barangay Malinis, Quezon City</p>
        </div>
        <div className="card">
          <h3>Store hours</h3>
          <p>Monday – Saturday, 8:00 AM – 7:00 PM</p>
        </div>
      </div>

      <p className="track-lede">
        Already have an order number? You can check your laundry status
        anytime on the Track Laundry page.
      </p>
    </div>
  );
}

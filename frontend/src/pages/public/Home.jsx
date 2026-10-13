import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="hero">
      <h1>Welcome to LaundriTrack</h1>
      <p>Manage your laundry orders — fast, clean, and organized.</p>
      <Link to="/track" className="btn">Track Your Laundry</Link>
    </div>
  );
}
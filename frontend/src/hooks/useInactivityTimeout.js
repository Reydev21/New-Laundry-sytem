import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

export const useInactivityTimeout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      // Inactivity timeout reached (15 minutes)
      void logout();
      alert("You have been automatically logged out due to 15 minutes of inactivity.");
      navigate("/login?timeout=true");
    }, INACTIVITY_LIMIT_MS);
  };

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (!user) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    const handleUserActivity = () => resetTimer();

    events.forEach((evt) => window.addEventListener(evt, handleUserActivity));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [navigate, location.pathname]);
};

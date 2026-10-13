import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  login,
  verifyOtp,
  resendOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} from "../../services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("timeout")) {
      setError("Session expired due to 15 minutes of inactivity. Please log in again.");
    } else if (params.get("expired")) {
      setError("Session token expired. Please log in again.");
    }
  }, [location]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await login(email, password);
      if (data.requiresOtp) {
        setRequiresOtp(true);
        setTempToken(data.tempToken);
        setMessage(data.message || "2FA verification required. Please enter your 6-digit OTP code.");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.response
          ? "Invalid email or password"
          : "Cannot reach the server. Ensure backend is running on port 5000.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await verifyOtp(tempToken, otpCode);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");
    try {
      const data = await resendOtp(tempToken);
      setMessage(data.message || "New OTP code sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP code.");
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await requestPasswordReset(email);
      setMessage(data.message || "Password reset OTP sent successfully.");
      setResetToken("");
      setNewPassword("");
      setResetOtpCode("");
      setForgotPasswordMode(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not send password reset OTP. Please check SMTP and Supabase setup."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetOtpVerify = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await verifyPasswordResetOtp(email, resetOtpCode);
      setResetToken(data.resetToken);
      setMessage(data.message || "OTP verified. Please choose a new password.");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = await resetPassword(resetToken, newPassword);
      setMessage(data.message || "Password updated successfully.");
      setForgotPasswordMode(false);
      setResetToken("");
      setResetOtpCode("");
      setNewPassword("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-login-page">
      <div className="staff-login-card">
        <h1 className="staff-login-title">
          {requiresOtp ? "Two-Factor Authentication" : forgotPasswordMode ? "Reset Password" : "Staff & Admin Login"}
        </h1>

        {message && <div className="staff-login-message">{message}</div>}
        {error && <p className="staff-login-error">{error}</p>}

        {!requiresOtp && !forgotPasswordMode && (
          <form className="staff-login-form" onSubmit={handleLoginSubmit}>
            <input
              className="staff-login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="staff-login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="staff-login-submit" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            <div className="staff-login-subactions">
              <button
                className="staff-login-link"
                type="button"
                onClick={() => {
                  setForgotPasswordMode(true);
                  setError("");
                  setMessage("");
                }}
              >
                Forgot Password?
              </button>
            </div>
          </form>
        )}

        {requiresOtp && (
          <form className="staff-login-form" onSubmit={handleOtpSubmit}>
            <p className="staff-login-helper">
              Enter the 6-digit authentication code to verify your identity.
            </p>
            <input
              className="staff-login-input staff-login-otp-input"
              type="text"
              placeholder="6-Digit OTP Code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button className="staff-login-submit" type="submit" disabled={loading || otpCode.length !== 6}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <div className="staff-login-inline-actions">
              <button
                className="staff-login-link"
                type="button"
                onClick={handleResendOtp}
              >
                Resend Code
              </button>
              <button
                className="staff-login-link staff-login-link-muted"
                type="button"
                onClick={() => {
                  setRequiresOtp(false);
                  setOtpCode("");
                  setError("");
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {forgotPasswordMode && !resetToken && (
          <form className="staff-login-form" onSubmit={handleForgotPasswordRequest}>
            <input
              className="staff-login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="staff-login-submit" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Reset OTP"}
            </button>
            <div className="staff-login-subactions">
              <button
                className="staff-login-link staff-login-link-muted"
                type="button"
                onClick={() => {
                  setForgotPasswordMode(false);
                  setError("");
                  setMessage("");
                }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        {forgotPasswordMode && !resetToken && message && message.toLowerCase().includes("otp") && (
          <form className="staff-login-form" onSubmit={handleResetOtpVerify}>
            <p className="staff-login-helper">Enter the 6-digit code sent to your email.</p>
            <input
              className="staff-login-input staff-login-otp-input"
              type="text"
              placeholder="6-Digit Reset Code"
              maxLength={6}
              value={resetOtpCode}
              onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button className="staff-login-submit" type="submit" disabled={loading || resetOtpCode.length !== 6}>
              {loading ? "Verifying..." : "Verify Reset Code"}
            </button>
          </form>
        )}

        {resetToken && (
          <form className="staff-login-form" onSubmit={handlePasswordReset}>
            <input
              className="staff-login-input"
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button className="staff-login-submit" type="submit" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
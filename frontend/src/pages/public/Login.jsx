import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  login,
  signupStaff,
  verifyOtp,
  resendOtp,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} from "../../services/authService";
import PasswordInput from "../../components/PasswordInput";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [createAccountMode, setCreateAccountMode] = useState(false);
  const [signupForm, setSignupForm] = useState({ name: "", email: "", password: "", role: "staff", inviteCode: "" });
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
          : "Cannot reach the server. Ensure the backend is running.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const data = await signupStaff(signupForm);
      if (data.requiresOtp) {
        setRequiresOtp(true);
        setTempToken(data.tempToken);
        setMessage(data.message || "Account created. Enter the 6-digit code sent to your email.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not create the account. Please try again.");
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
        (err.request
          ? "Cannot reach the server. Ensure the backend is running."
          : "Could not send password reset OTP.")
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
      navigate("/admin");
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
          {requiresOtp ? "Two-Factor Authentication" : forgotPasswordMode ? "Reset Password" : createAccountMode ? "Create Account" : "Staff & Admin Login"}
        </h1>

        {message && <div className="staff-login-message">{message}</div>}
        {error && <p className="staff-login-error">{error}</p>}

        {!requiresOtp && !forgotPasswordMode && !createAccountMode && (
          <form className="staff-login-form" onSubmit={handleLoginSubmit}>
            <input
              className="staff-login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              className="staff-login-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="staff-login-submit" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
            <div className="staff-login-inline-actions">
              <button
                className="staff-login-link"
                type="button"
                onClick={() => {
                  setCreateAccountMode(true);
                  setError("");
                  setMessage("");
                }}
              >
                Create Account
              </button>
              <button
                className="staff-login-link staff-login-link-muted"
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

        {!requiresOtp && !forgotPasswordMode && createAccountMode && (
          <form className="staff-login-form" onSubmit={handleSignupSubmit}>
            <p className="staff-login-helper">
              Create a staff or admin account. An invite code is required, and a 6-digit code will be
              emailed to confirm your address.
            </p>
            <input
              className="staff-login-input"
              type="text"
              placeholder="Full Name"
              value={signupForm.name}
              onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
              required
            />
            <input
              className="staff-login-input"
              type="email"
              placeholder="Email"
              value={signupForm.email}
              onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
              required
            />
            <PasswordInput
              className="staff-login-input"
              placeholder="Password"
              value={signupForm.password}
              onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
              required
              autoComplete="new-password"
            />
            <p className="staff-login-hint">
              Must be at least 8 chars with uppercase, lowercase, number, &amp; special char.
            </p>
            <select
              className="staff-login-input"
              value={signupForm.role}
              onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <input
              className="staff-login-input"
              type="text"
              placeholder="Invite Code"
              value={signupForm.inviteCode}
              onChange={(e) => setSignupForm({ ...signupForm, inviteCode: e.target.value })}
              required
            />
            <button className="staff-login-submit" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
            <div className="staff-login-subactions">
              <button
                className="staff-login-link staff-login-link-muted"
                type="button"
                onClick={() => {
                  setCreateAccountMode(false);
                  setError("");
                  setMessage("");
                }}
              >
                Back to Login
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
            <PasswordInput
              className="staff-login-input"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
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
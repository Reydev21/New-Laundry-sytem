import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { registerCustomer, verifyCustomerOtp, googleAuthCustomer } from "../../services/customerPortalService";
import {
  login,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} from "../../services/authService";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function CustomerAuth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
  });

  const [otpCode, setOtpCode] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetOtpCode, setResetOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(formData.email, formData.password);
      if (data.requiresOtp) {
        setRequiresOtp(true);
        setTempToken(data.tempToken);
        setOtpNotice(data.message || "OTP required. Please check your email.");
      } else {
        navigate("/customer/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await registerCustomer(formData);
      if (data.requiresOtp) {
        setRequiresOtp(true);
        setTempToken(data.tempToken);
        setOtpNotice(data.message || `OTP code sent to ${data.email}.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyCustomerOtp(tempToken, otpCode);
      navigate("/customer/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async ({ credential }) => {
    if (!credential) {
      setError("Google did not return a sign-in credential. Please try again.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await googleAuthCustomer({ credential });
      navigate("/customer/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Google sign-in could not reach the server. Make sure the backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await requestPasswordReset(formData.email);
      setOtpNotice(data.message || "Password reset OTP has been sent to your email.");
      setForgotPasswordMode(true);
      setResetOtpCode("");
      setResetToken("");
      setNewPassword("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not send password reset OTP. Please check SMTP and Supabase setup."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await verifyPasswordResetOtp(formData.email, resetOtpCode);
      setResetToken(data.resetToken);
      setOtpNotice(data.message || "OTP verified. Please enter a new password.");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid reset OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await resetPassword(resetToken, newPassword);
      setOtpNotice(data.message || "Password reset successful.");
      setForgotPasswordMode(false);
      setResetToken("");
      setResetOtpCode("");
      setNewPassword("");
      setFormData((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth-page">
      <div className={`customer-auth-card${isSignUp ? " customer-auth-card-signup" : ""}`}>
        <h2 className={`customer-auth-title${isSignUp ? " customer-auth-title-signup" : ""}`}>
          {requiresOtp ? "Verify Your OTP" : forgotPasswordMode ? "Reset Your Password" : isSignUp ? "Create Customer Account" : "Customer Login"}
        </h2>
        <p className="customer-auth-subtitle">
          {requiresOtp ? "Enter the 6-digit OTP code sent to your email/phone." : forgotPasswordMode ? "Enter your email to receive a reset code." : isSignUp ? "Sign up to track orders & book laundry online" : "Access your laundry orders and online payments"}
        </p>

        {error && <div className="customer-auth-alert customer-auth-alert-error">{error}</div>}
        {otpNotice && <div className="customer-auth-alert customer-auth-alert-info">{otpNotice}</div>}

        {requiresOtp ? (
          <form onSubmit={handleVerifyOtp} className="customer-auth-form">
            <input
              type="text"
              placeholder="6-Digit OTP Code"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
              required
              className="customer-auth-otp-input"
            />
            <button type="submit" disabled={loading || otpCode.length !== 6} className="customer-auth-submit">
              {loading ? "Verifying OTP..." : "Verify & Complete Signup"}
            </button>
          </form>
        ) : forgotPasswordMode ? (
          <>
            {!resetToken ? (
              <form onSubmit={handleForgotPasswordRequest} className="customer-auth-form">
                <div className="customer-auth-field">
                  <label>Email Address</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required />
                </div>
                <button type="submit" disabled={loading} className="customer-auth-submit">
                  {loading ? "Sending..." : "Send Reset OTP"}
                </button>
              </form>
            ) : null}

            {!resetToken && otpNotice && otpNotice.toLowerCase().includes("otp") && (
              <form onSubmit={handleResetOtpSubmit} className="customer-auth-form">
                <div className="customer-auth-field">
                  <label>Reset OTP Code</label>
                  <input
                    type="text"
                    value={resetOtpCode}
                    onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    required
                    className="customer-auth-otp-input"
                  />
                </div>
                <button type="submit" disabled={loading || resetOtpCode.length !== 6} className="customer-auth-submit">
                  {loading ? "Verifying..." : "Verify Reset Code"}
                </button>
              </form>
            )}

            {resetToken && (
              <form onSubmit={handlePasswordReset} className="customer-auth-form">
                <div className="customer-auth-field">
                  <label>New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading} className="customer-auth-submit">
                  {loading ? "Updating..." : "Create New Password"}
                </button>
              </form>
            )}

            <div className="customer-auth-actions customer-auth-actions-center">
              <button
                type="button"
                onClick={() => {
                  setForgotPasswordMode(false);
                  setResetToken("");
                  setResetOtpCode("");
                  setNewPassword("");
                  setOtpNotice("");
                  setError("");
                }}
                className="customer-auth-link-button"
              >
                Back to Login
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="customer-auth-provider">
              {googleClientId ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError(
                    `Google sign-in could not complete for ${window.location.origin}. Add this origin to the Google OAuth client's Authorized JavaScript origins in Google Cloud Console.`
                  )}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  shape="rectangular"
                  useOneTap={false}
                />
              ) : (
                <button
                  type="button"
                  disabled
                  title="Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID to enable Google sign-in"
                  className="customer-auth-google-button"
                >
                  Google Sign-In setup required
                </button>
              )}
            </div>

            <div className="customer-auth-divider">
              <span>OR</span>
            </div>

            <form onSubmit={isSignUp ? handleSignUpSubmit : handleLoginSubmit} className="customer-auth-form">
              {isSignUp && (
                <>
                  <div className="customer-auth-field">
                    <label>Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="customer-auth-field">
                    <label>Phone Number</label>
                    <input type="text" name="phone" placeholder="09171234567" value={formData.phone} onChange={handleChange} required />
                  </div>
                </>
              )}

              <div className="customer-auth-field">
                <label>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="customer-auth-field customer-auth-field-last">
                <label>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                {isSignUp && <p className="customer-auth-hint">Must be at least 8 chars with uppercase, lowercase, number, & special char.</p>}
              </div>

              <button type="submit" disabled={loading} className="customer-auth-submit">
                {loading ? "Processing..." : isSignUp ? "Register with OTP" : "Login"}
              </button>
            </form>

            <div className="customer-auth-actions">
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="customer-auth-link-button"
              >
                {isSignUp ? "Already have an account? Login here" : "Don't have an account? Create one"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotPasswordMode(true);
                  setError("");
                  setOtpNotice("");
                }}
                className="customer-auth-link-button customer-auth-link-button-secondary"
              >
                Forgot Password?
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

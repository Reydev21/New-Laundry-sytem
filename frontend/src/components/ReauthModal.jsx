import { useEffect, useState } from "react";
import { requestActionOtp, verifyActionOtp } from "../services/actionReauth";

export default function ReauthModal({ title = "Confirm This Action", onClose, onVerified }) {
  const [otpCode, setOtpCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const sendCode = async () => {
    setSending(true);
    setError("");
    try {
      const data = await requestActionOtp();
      setMessage(data.message || "A 6-digit confirmation code was sent to your email.");
      if (data.otpCode) setMessage((prev) => `${prev} (dev code: ${data.otpCode})`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the confirmation code.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await verifyActionOtp(otpCode);
      await onVerified(data.reauthToken);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired confirmation code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reauth-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="reauth-card">
        <h3 className="reauth-title">{title}</h3>
        <p className="reauth-helper">
          For your security, confirm with the 6-digit code sent to your email.
        </p>
        {message && <div className="reauth-message">{message}</div>}
        {error && <p className="reauth-error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="reauth-form">
          <input
            className="reauth-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
            required
          />
          <div className="reauth-actions">
            <button type="button" className="reauth-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="reauth-confirm" disabled={loading || otpCode.length !== 6}>
              {loading ? "Verifying..." : "Confirm"}
            </button>
          </div>
        </form>
        <button type="button" className="reauth-resend" onClick={sendCode} disabled={sending}>
          {sending ? "Sending..." : "Resend code"}
        </button>
      </div>
    </div>
  );
}

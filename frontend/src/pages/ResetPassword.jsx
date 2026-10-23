
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { API_URL as BASE } from "../api";
const API_URL = `${BASE}/auth`;

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (!token) {
      setError("The password reset token is missing. Please open the link from your email again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, newPassword: password, confirmPassword }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "We could not reset your password.");
      }

      setSuccess(data.message || "Password reset successfully.");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to the server. Make sure the backend is running on port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <section className="register-visual">
        <Link to="/" className="register-brand">
          <span className="register-brand-icon">E</span>
          <span>EventSphere</span>
        </Link>

        <div className="register-visual-content">
          <span className="register-eyebrow">SECURE YOUR ACCOUNT</span>
          <h1>
            Choose a new
            <br />
            <span>password.</span>
          </h1>
          <p>
            Create a strong password to keep your EventSphere account secure.
          </p>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-form-wrap">
          <span className="register-kicker">PASSWORD RESET</span>
          <h2>Set new password.</h2>
          <p className="register-subtitle">
            Use at least 8 characters and confirm your new password.
          </p>

          {error && (
            <div className="register-message register-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="register-message register-success" role="status">
              {success} Redirecting to sign in...
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="new-password">New password</label>
              <div className="register-password-wrap">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="register-show-password"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter the password again"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              className="register-submit"
              type="submit"
              disabled={loading || Boolean(success)}
            >
              {loading ? "Updating password..." : "Update Password ↗"}
            </button>
          </form>

          <Link to="/login" className="register-back">
            ← Back to sign in
          </Link>
          <p className="register-copyright">
            © 2026 EventSphere Management
          </p>
        </div>
      </section>
    </main>
  );
}
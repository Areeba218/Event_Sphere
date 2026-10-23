
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { API_URL as BASE } from "../api";
const API_URL = `${BASE}/auth`;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "We could not send the password reset email.");
      }

      setSuccess(
        data.message ||
          "If an account exists for this email address, password reset instructions will be sent."
      );
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
          <span className="register-eyebrow">ACCOUNT RECOVERY</span>
          <h1>
            A fresh start,
            <br />
            <span>just one link away.</span>
          </h1>
          <p>
            Enter your account email and we’ll help you securely reset
            your password.
          </p>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-top-link">
          Remembered it? <Link to="/login">Sign in ↗</Link>
        </div>

        <motion.div
          className="register-form-wrap"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="register-kicker">FORGOT PASSWORD</span>
          <h2>Reset your password.</h2>
          <p className="register-subtitle">
            We’ll send you a link to choose a new password.
          </p>

          {error && (
            <div className="register-message register-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="register-message register-success" role="status">
              {success}
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <button className="register-submit" type="submit" disabled={loading}>
              {loading ? "Sending link..." : "Send Reset Link ↗"}
            </button>
          </form>

          <Link to="/login" className="register-back">
            ← Back to sign in
          </Link>
          <p className="register-copyright">
            © 2026 EventSphere Management
          </p>
        </motion.div>
      </section>
    </main>
  );
}


import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { API_URL as BASE } from "../api";
const API_URL = `${BASE}/auth`;

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "attendee",
    inviteCode: "",
    consent: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }
    if (!form.consent) {
      setError("Please accept the Privacy Policy to create an account.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "We could not create your account.");
      }

      setSuccess(
        data.message ||
          "Your account has been created. Check your email and open the verification link before signing in."
      );
      setForm({ name: "", email: "", password: "", role: "attendee", inviteCode: "", consent: false });
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
      <motion.section
        className="register-visual"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/" className="register-brand">
          <span className="register-brand-icon">E</span>
          <span>EventSphere</span>
        </Link>

        <div className="register-visual-content">
          <span className="register-eyebrow">
            YOUR NEXT CONNECTION STARTS HERE
          </span>
          <h1>
            Be part of
            <br />
            <span>something bigger.</span>
          </h1>
          <p>
            Join EventSphere to discover exhibitions, connect with
            professionals and grow your presence at industry events.
          </p>
        </div>
      </motion.section>

      <section className="register-panel">
        <div className="register-top-link">
          Already a member? <Link to="/login">Sign in ↗</Link>
        </div>

        <motion.div
          className="register-form-wrap"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="register-kicker">CREATE YOUR ACCOUNT</span>
          <h2>Join EventSphere.</h2>
          <p className="register-subtitle">
            Enter your details to get started.
          </p>

          {error && (
            <div className="register-message register-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="register-message register-success" role="status">
              {success}
              <p>
                <Link to="/login">Go to sign in</Link>
              </p>
            </div>
          )}

          <form className="register-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password">Password</label>
              <div className="register-password-wrap">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="8+ characters, letters and numbers"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  minLength={8}
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
              <label htmlFor="register-role">I want to join as</label>
              <select
                id="register-role"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="attendee">Attendee — discover events</option>
                <option value="exhibitor">Exhibitor — showcase my brand</option>
                <option value="organizer">Organizer — manage expos</option>
              </select>
            </div>

            {form.role === "organizer" && (
              <div>
                <label htmlFor="register-invite">Organizer invite code (if required)</label>
                <input id="register-invite" name="inviteCode" type="text" value={form.inviteCode} onChange={handleChange} autoComplete="off" />
              </div>
            )}
            <label className="register-consent">
              <input type="checkbox" name="consent" checked={form.consent} onChange={handleChange} required />
              <span>I have read the <Link to="/privacy" target="_blank">Privacy Policy</Link> and consent to EventSphere processing my data as described.</span>
            </label>
            <button className="register-submit" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account ↗"}
            </button>
          </form>

          <p className="register-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <Link to="/" className="register-back">
            ← Back to homepage
          </Link>
          <p className="register-copyright">
            © 2026 EventSphere Management
          </p>
        </motion.div>
      </section>
    </main>
  );
}

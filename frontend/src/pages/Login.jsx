
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { API_URL as BASE } from "../api";
const API_URL = `${BASE}/auth`;

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.token) {
        throw new Error("The server did not return an authentication token.");
      }

      localStorage.setItem("token", data.token);

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("username", data.user.name || "");
        localStorage.setItem("role", data.user.role || "attendee");
      }

      navigate("/dashboard");
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
    <main className="modern-login">
      <motion.section
        className="login-showcase"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Link to="/" className="login-brand">
          <span className="login-brand-mark">E</span>
          <span>
            Event<span>Sphere</span>
          </span>
        </Link>

        <div className="showcase-content">
          <span className="showcase-kicker">
            EVENTS / EXHIBITIONS / NETWORKING
          </span>

          <h1>
            Where industries
            <br />
            <span>come together.</span>
          </h1>

          <p>
            Discover exhibitions, meet industry leaders,
            showcase your brand and manage every event
            experience — all in one place.
          </p>

          <div className="showcase-stats">
            <div>
              <strong>Discover</strong>
              <span>Industry events</span>
            </div>
            <div>
              <strong>Connect</strong>
              <span>With professionals</span>
            </div>
            <div>
              <strong>Grow</strong>
              <span>Your business</span>
            </div>
          </div>
        </div>
      </motion.section>

      <section className="login-panel">
        <div className="login-top-link">
          <span>New to EventSphere? </span>
          <Link to="/register">Create account ↗</Link>
        </div>

        <motion.div
          className="login-form-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="login-overline">WELCOME BACK</span>

          <h2>Sign in to continue.</h2>

          <p className="login-subtitle">
            Pick up where you left off. Your next connection awaits.
          </p>

          {error && (
            <div className="login-alert" role="alert">
              {error}
            </div>
          )}

          <form className="modern-login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>

              <div className="modern-input-wrap">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="m4 7 8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <div className="password-label-row">
                <label htmlFor="login-password">Password</label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

              <div className="modern-input-wrap">
                <svg
                  className="input-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="4"
                    y="10"
                    width="16"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10V7a4 4 0 0 1 8 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="15" r="1.2" fill="currentColor" />
                </svg>

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              className="modern-login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In ↗"}
            </button>
          </form>

          <div className="login-divider">
            <span>EVENTSPHERE</span>
          </div>

          <p className="login-bottom-copy">
            Don't have an account?{" "}
            <Link to="/register">Create one</Link>
          </p>

          <Link to="/" className="login-home-link">
            ← Back to homepage
          </Link>
        </motion.div>

        <p className="login-legal">
          © 2026 EventSphere Management
        </p>
      </section>
    </main>
  );
}

export default Login;

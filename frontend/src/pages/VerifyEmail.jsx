
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { API_URL as BASE } from "../api";
const API_URL = `${BASE}/auth`;

export default function VerifyEmail() {
  const { token } = useParams();
  const requestStarted = useRef(false);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (requestStarted.current) return;
    requestStarted.current = true;

    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("The verification token is missing.");
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/verify-email/${encodeURIComponent(token)}`
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Email verification failed.");
        }

        setStatus("success");
        setMessage(data.message || "Your email has been verified successfully.");
      } catch (err) {
        setStatus("error");
        setMessage(
          err.message === "Failed to fetch"
            ? "Unable to connect to the server. Please try again later."
            : err.message
        );
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <main className="register-page">
      <section className="register-visual">
        <Link to="/" className="register-brand">
          <span className="register-brand-icon">E</span>
          <span>EventSphere</span>
        </Link>

        <div className="register-visual-content">
          <span className="register-eyebrow">EVENTSPHERE ACCOUNT</span>
          <h1>
            One last step,
            <br />
            <span>then you’re in.</span>
          </h1>
          <p>
            Verify your email to finish setting up your EventSphere account.
          </p>
        </div>
      </section>

      <section className="register-panel">
        <div className="register-form-wrap">
          <span className="register-kicker">EMAIL VERIFICATION</span>
          <h2>
            {status === "loading"
              ? "Checking your email..."
              : status === "success"
                ? "You're verified!"
                : "Verification failed"}
          </h2>

          <div
            className={`register-message ${
              status === "error" ? "register-error" : "register-success"
            }`}
            role="status"
          >
            {status === "loading" ? "Please wait while we verify your email." : message}
          </div>

          {status === "success" && (
            <Link to="/login" className="register-submit">
              Continue to Sign In ↗
            </Link>
          )}

          {status === "error" && (
            <Link to="/register" className="register-submit">
              Back to Registration
            </Link>
          )}

          <Link to="/" className="register-back">
            ← Back to homepage
          </Link>
          <p className="register-copyright">
            © 2026 EventSphere Management
          </p>
        </div>
      </section>
    </main>
  );
}

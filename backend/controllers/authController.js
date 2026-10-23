const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const { passwordProblem } = require("../utils/validators");
const CONSENT_VERSION = "2026-10";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const registerUser = async (req, res) => {
  try {
    const { name, password, role, consent, inviteCode } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email : "";

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Full name, email address, and password are required.",
      });
    }

    const passwordIssue = passwordProblem(password);
    if (passwordIssue) {
      return res.status(400).json({ message: passwordIssue });
    }

    if (consent !== true) {
      return res.status(400).json({
        message: "You must accept the Privacy Policy and consent to data processing to create an account.",
      });
    }

    if (role === "organizer") {
      if (process.env.ALLOW_ORGANIZER_SIGNUP === "false") {
        return res.status(403).json({ message: "Organizer accounts are created by invitation only." });
      }
      if (process.env.ORGANIZER_INVITE_CODE && inviteCode !== process.env.ORGANIZER_INVITE_CODE) {
        return res.status(403).json({ message: "A valid organizer invite code is required." });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        return res.status(409).json({
          message:
            "This email address is already registered but not verified. Check your inbox for the verification email or contact support.",
        });
      }

      return res.status(409).json({
        message:
          "This email address is already registered. Please sign in or reset your password.",
      });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role: ["organizer", "exhibitor", "attendee"].includes(role) ? role : "attendee",
      isEmailVerified: false,
      consentAt: new Date(),
      consentVersion: CONSENT_VERSION,
      emailVerificationToken: hashToken(verificationToken),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");
    const verificationLink = `${frontendUrl}/verify-email/${verificationToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify Your EventSphere Account",
        text:
          `Hello ${user.name},\n\n` +
          "Thank you for creating an EventSphere account. Verify your email by opening this link:\n\n" +
          `${verificationLink}\n\n` +
          "This link expires in 24 hours. If you did not create this account, you can ignore this email.",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#21152b">
            <h1 style="color:#9237d8">Welcome to EventSphere</h1>
            <p>Hello ${escapeHtml(user.name)},</p>
            <p>Thank you for creating an EventSphere account. Verify your email address to activate your account.</p>
            <p><a href="${verificationLink}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#a13be4;color:#fff;text-decoration:none;font-weight:bold">Verify Email Address</a></p>
            <p>This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
          </div>`,
      });
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);
      console.error("Verification email error:", emailError.message);
      return res.status(503).json({
        message:
          "We could not send the verification email. Please check the email settings and try again.",
      });
    }

    return res.status(201).json({
      message:
        "Registration successful. Check your email and verify your account before signing in.",
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email address is already registered.",
      });
    }
    return res.status(500).json({
      message: "Registration failed due to a server error. Please try again.",
    });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: "The verification token is missing." });
    }

    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "This verification link is invalid or has expired. Please register again or contact support.",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("Email verification error:", error.message);
    return res.status(500).json({
      message: "Email verification failed due to a server error. Please try again.",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email address and password are required.",
      });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email address or password." });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email address before signing in.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from the environment.");
      return res.status(500).json({
        message: "Authentication is temporarily unavailable. Please try again later.",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Sign-in successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Sign-in error:", error.message);
    return res.status(500).json({
      message: "Sign-in failed due to a server error. Please try again.",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = typeof req.body.email === "string" ? req.body.email : "";
    if (!email.trim()) {
      return res.status(400).json({ message: "Email address is required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    const genericMessage =
      "If an account exists for this email address, password reset instructions will be sent.";

    const masked = email.trim().replace(/^(.{2}).*(@.*)$/, "$1***$2");
    if (!user) {
      // Same response for the client (no account enumeration), but the server log says what happened.
      console.log(`[forgot-password] No account found for ${masked}; no email sent.`);
      return res.status(200).json({ message: genericMessage });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset Your EventSphere Password",
        text:
          `Hello ${user.name},\n\n` +
          `Use this link to reset your EventSphere password:\n\n${resetLink}\n\n` +
          "This link expires in 15 minutes. If you did not request a password reset, you can ignore this email.",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px;color:#21152b">
            <h1 style="color:#9237d8">Reset Your Password</h1>
            <p>Hello ${escapeHtml(user.name)},</p>
            <p>We received a request to reset your EventSphere password.</p>
            <p><a href="${resetLink}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#a13be4;color:#fff;text-decoration:none;font-weight:bold">Reset Password</a></p>
            <p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>
          </div>`,
      });
    } catch (emailError) {
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      console.error("Password reset email error:", emailError.code || "", emailError.message);
      return res.status(503).json({
        message: "We could not send the password reset email. Please try again later.",
      });
    }

    console.log(`[forgot-password] Reset email sent to ${masked}.`);
    return res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.status(500).json({
      message: "The password reset request failed. Please try again.",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, newPassword, confirmPassword } = req.body;
    const requestedPassword = newPassword || password;

    const resetIssue = passwordProblem(requestedPassword);
    if (resetIssue) {
      return res.status(400).json({ message: resetIssue });
    }

    if (confirmPassword && requestedPassword !== confirmPassword) {
      return res.status(400).json({ message: "The passwords do not match." });
    }

    if (!token) {
      return res.status(400).json({ message: "The password reset token is missing." });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "This password reset link is invalid or has expired. Request a new one.",
      });
    }

    user.password = await bcrypt.hash(requestedPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error.message);
    return res.status(500).json({
      message: "Password reset failed due to a server error. Please try again.",
    });
  }
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
};

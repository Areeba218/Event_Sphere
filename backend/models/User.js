
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["organizer", "exhibitor", "attendee"],
      default: "attendee",
    },

    companyName: { type: String, default: "", trim: true },
    productsServices: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    logo: { type: String, default: "" },
    // Privacy & consent (GDPR)
    consentAt: { type: Date, default: null },
    consentVersion: { type: String, default: "" },
    shareContact: { type: Boolean, default: true },
    reminderEmails: { type: Boolean, default: true },

    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      default: null,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    // Password reset
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);

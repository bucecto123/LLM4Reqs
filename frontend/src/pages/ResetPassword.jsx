import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowLeft, Check, Eye, EyeOff } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8001";

// Typing animation component
const TypingText = ({ text, speed = 50, className = "" }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const isTypingComplete = currentIndex >= text.length;

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.substring(0, currentIndex + 1));
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <>
      <style>{`
        @keyframes typingBlink {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }
        .typing-cursor-blink {
          animation: typingBlink 0.8s step-start infinite;
        }
      `}</style>
      <span className={className}>
        {displayedText}
        <span
          className={`inline-block w-0.5 h-10 bg-current ml-1 align-middle ${
            isTypingComplete ? "typing-cursor-blink" : ""
          }`}
        ></span>
      </span>
    </>
  );
};

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const emailFromUrl = searchParams.get("email");

  const [formData, setFormData] = useState({
    email: emailFromUrl || "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: "Very weak",
  });

  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: "Very weak" };
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (/[a-z]/.test(pw)) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/\d/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    const labels = [
      "Very weak",
      "Weak",
      "Moderate",
      "Strong",
      "Very strong",
      "Excellent",
    ];
    return { score, label: labels[Math.min(score, labels.length - 1)] };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: undefined });
    }

    if (name === "password") {
      setPasswordStrength(getPasswordStrength(value || ""));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    // Validation
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = ["Email is required"];
    }

    if (!formData.code) {
      newErrors.code = ["Reset code is required"];
    } else if (formData.code.length !== 6) {
      newErrors.code = ["Reset code must be 6 digits"];
    }

    if (!formData.password) {
      newErrors.password = ["Password is required"];
    } else if (formData.password.length < 8) {
      newErrors.password = ["Password must be at least 8 characters"];
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = ["Passwords do not match"];
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError("Please fix the highlighted fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          setFieldErrors(data.errors);
          setError("Please fix the highlighted fields");
        } else {
          throw new Error(data.message || "Password reset failed");
        }
        return;
      }

      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strengthColor = () => {
    const colors = [
      "#E74C3C",
      "#E67E22",
      "#F39C12",
      "#2ECC71",
      "#27AE60",
      "#1ABC9C",
    ];
    return colors[passwordStrength.score] || colors[0];
  };

  const strengthWidth = () => {
    return `${(passwordStrength.score / 5) * 100}%`;
  };

  return (
    <>
      <style>{`
        @keyframes swim {
          0%, 100% {
            transform: translateX(0) translateY(0) rotate(0deg);
          }
          25% {
            transform: translateX(3px) translateY(-2px) rotate(-8deg);
          }
          50% {
            transform: translateX(0) translateY(-4px) rotate(0deg);
          }
          75% {
            transform: translateX(-3px) translateY(-2px) rotate(8deg);
          }
        }
        
        .fish-swim {
          animation: swim 2.5s ease-in-out infinite;
          display: inline-block;
          transform-origin: center;
          will-change: transform;
        }
        
        .fish-container:hover .fish-swim {
          animation: swim 1s ease-in-out infinite;
        }
        
        .fish-container {
          transition: all 0.3s ease;
        }
        
        .fish-container:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(74, 123, 167, 0.5);
        }
      `}</style>
      <div className="min-h-screen flex bg-[#F9FAFB]">
        {/* Left Side - Branding */}
        <div
          className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-[#112D4E]"
          style={{ minHeight: "100vh" }}
        >
          <div className="relative z-10 flex flex-col justify-center h-full px-16">
            <div className="mb-8 fish-container inline-block self-start">
              <span className="fish-swim text-6xl">🐟</span>
            </div>
            <h1
              className="text-6xl font-bold mb-6 leading-tight"
              style={{ color: "#DBE2EF" }}
            >
              <TypingText text="Reset Your Password" speed={60} />
            </h1>
            <p className="text-xl mb-8" style={{ color: "#DBE2EF" }}>
              Create a new secure password for your account
            </p>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Right Side - Reset Password Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Logo for mobile */}
            <div className="lg:hidden mb-8 text-center">
              <div className="inline-block fish-container">
                <span className="fish-swim text-5xl">🐟</span>
              </div>
              <h2
                className="text-3xl font-bold mt-4"
                style={{ color: "#112D4E" }}
              >
                Reset Password
              </h2>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="mb-6">
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
                >
                  <ArrowLeft size={20} />
                  <span>Back to Login</span>
                </button>
                <h2
                  className="text-3xl font-bold mb-2"
                  style={{ color: "#112D4E" }}
                >
                  Reset Password
                </h2>
                <p className="text-gray-600">Enter your new password below</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <p className="text-red-800 text-sm flex-1">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
                  <Check
                    className="text-green-600 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <p className="text-green-800 text-sm flex-1">{success}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                      style={{
                        borderColor: formData.email ? "#4A7BA7" : undefined,
                      }}
                      readOnly={!!emailFromUrl}
                    />
                  </div>
                  {fieldErrors.email && (
                    <div className="text-xs text-red-600 mt-1">
                      {fieldErrors.email[0]}
                    </div>
                  )}
                </div>

                {/* Reset Code */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Reset Code
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      placeholder="Enter 6-digit code from email"
                      maxLength={6}
                      className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none transition-all text-center text-2xl tracking-widest font-mono"
                      style={{
                        borderColor: formData.code ? "#4A7BA7" : undefined,
                      }}
                    />
                  </div>
                  {fieldErrors.code && (
                    <div className="text-xs text-red-600 mt-1">
                      {fieldErrors.code[0]}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Check your email for the 6-digit code
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                      style={{
                        borderColor: formData.password ? "#4A7BA7" : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <div className="text-xs text-red-600 mt-1">
                      {fieldErrors.password[0]}
                    </div>
                  )}

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600">
                          Password Strength:
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{ color: strengthColor() }}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: strengthWidth(),
                            backgroundColor: strengthColor(),
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={20}
                    />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-11 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                      style={{
                        borderColor: formData.confirmPassword
                          ? "#4A7BA7"
                          : undefined,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <div className="text-xs text-red-600 mt-1">
                      {fieldErrors.confirmPassword[0]}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center space-x-2 ${
                    isLoading
                      ? "opacity-80 cursor-not-allowed"
                      : "hover:shadow-xl hover:scale-105 active:scale-100"
                  }`}
                  style={{ backgroundColor: "#4A7BA7" }}
                >
                  <span>
                    {isLoading ? "Resetting Password..." : "Reset Password"}
                  </span>
                  {isLoading && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

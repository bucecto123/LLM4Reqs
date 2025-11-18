import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, Check } from "lucide-react";

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

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    // Validation
    if (!email.trim()) {
      setFieldErrors({ email: ["Email is required"] });
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          setFieldErrors(data.errors);
          setError("Please fix the highlighted fields");
        } else {
          throw new Error(data.message || "Failed to send reset link");
        }
        return;
      }

      setSuccess(
        "Password reset link has been sent to your email. Please check your inbox."
      );
      setEmail("");
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
              <TypingText text="Forgot Password?" speed={60} />
            </h1>
            <p className="text-xl mb-8" style={{ color: "#DBE2EF" }}>
              Don't worry! We'll send you a link to reset your password.
            </p>
          </div>

          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
        </div>

        {/* Right Side - Forgot Password Form */}
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
                Forgot Password
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
                  Forgot Password
                </h2>
                <p className="text-gray-600">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </p>
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
                      value={email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                      style={{
                        borderColor: email ? "#4A7BA7" : undefined,
                      }}
                    />
                  </div>
                  {fieldErrors.email && (
                    <div className="text-xs text-red-600 mt-1">
                      {fieldErrors.email[0]}
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
                  <span>{isLoading ? "Sending..." : "Send Reset Link"}</span>
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

              {/* Additional Help */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Remember your password?{" "}
                  <button
                    onClick={() => navigate("/")}
                    className="font-semibold hover:underline"
                    style={{ color: "#4A7BA7" }}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

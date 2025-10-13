import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import api, { apiFetch, saveAuth } from '../utils/api';

export default function AuthPages() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // clear field error on change
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: undefined });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Will be replaced by async handler below
  };

  // async submit handler for register/login (uses apiFetch)
  const submitAsync = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});

    // small client-side checks
    if (!formData.email) {
      setFieldErrors({ ...fieldErrors, email: ['Email is required'] });
      return;
    }
    if (!formData.password) {
      setFieldErrors({ ...fieldErrors, password: ['Password is required'] });
      return;
    }
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setFieldErrors({ ...fieldErrors, confirmPassword: ['Passwords do not match'] });
      return;
    }

    try {
      if (isLogin) {
        const data = await apiFetch('/api/login', {
          method: 'POST',
          body: { email: formData.email, password: formData.password },
        });

        // expected { token, user } from backend
        // backend returns { user, token }
        saveAuth(data.token || data.token, data.user || data.user);
        setSuccess('Logged in successfully');
        console.log('Logged in', data.user);
        // App listens for authChanged and will navigate to dashboard

      } else {
        const data = await apiFetch('/api/register', {
          method: 'POST',
          body: {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            password_confirmation: formData.confirmPassword,
          },
        });

        // backend returns { user, token }
        saveAuth(data.token, data.user);
        setSuccess('Account created');
        // App will switch to dashboard when token saved
      }
    } catch (err) {
      console.error('Auth error', err);
      // Laravel validation errors (422) come in err.body.errors
      if (err && err.status === 422 && err.body && err.body.errors) {
        setFieldErrors(err.body.errors);
        setError('Please fix the highlighted fields');
        return;
      }

      // other errors
      const message = (err && (err.message || (err.body && err.body.message))) || 'Request failed';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ backgroundColor: '#112D4E' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full" style={{ backgroundColor: '#4A7BA7' }}></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full" style={{ backgroundColor: '#DBE2EF' }}></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#4A7BA7' }}>
              <span className="text-4xl">🐟</span>
            </div>
            <span className="text-4xl font-bold">Fishy</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Your AI-Powered<br />Assistant
          </h1>
          
          <p className="text-xl opacity-90 mb-8" style={{ color: '#DBE2EF' }}>
            Experience the future of productivity with Fishy AI. Get instant answers, creative solutions, and intelligent assistance.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4A7BA7' }}>
                <span className="text-lg">✓</span>
              </div>
              <span className="text-lg">Real-time AI responses</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4A7BA7' }}>
                <span className="text-lg">✓</span>
              </div>
              <span className="text-lg">Advanced research capabilities</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4A7BA7' }}>
                <span className="text-lg">✓</span>
              </div>
              <span className="text-lg">Secure and private conversations</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#4A7BA7' }}>
              <span className="text-3xl">🐟</span>
            </div>
            <span className="text-3xl font-bold" style={{ color: '#112D4E' }}>Fishy</span>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            {/* Tabs */}
            <div className="flex rounded-lg p-1 mb-8" style={{ backgroundColor: '#DBE2EF' }}>
              <button
                onClick={() => setIsLogin(true)}
                className="flex-1 py-3 rounded-lg font-semibold transition-all duration-200"
                style={isLogin ? { backgroundColor: '#4A7BA7', color: 'white' } : { color: '#112D4E' }}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className="flex-1 py-3 rounded-lg font-semibold transition-all duration-200"
                style={!isLogin ? { backgroundColor: '#4A7BA7', color: 'white' } : { color: '#112D4E' }}
              >
                Sign Up
              </button>
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2" style={{ color: '#112D4E' }}>
                {isLogin ? 'Welcome back!' : 'Create account'}
              </h2>
              <p className="text-gray-600">
                {isLogin 
                  ? 'Enter your credentials to access your account' 
                  : 'Sign up to start your journey with Fishy AI'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submitAsync} className="space-y-5">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
              )}
              {success && (
                <div className="text-sm text-green-700 bg-green-50 p-2 rounded">{success}</div>
              )}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#112D4E' }}>
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                      style={{ 
                        borderColor: formData.name ? '#4A7BA7' : undefined,
                      }}
                    />
                  </div>
                  {fieldErrors.name && (
                    <div className="text-xs text-red-600 mt-1">{fieldErrors.name[0]}</div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#112D4E' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                    style={{ 
                      borderColor: formData.email ? '#4A7BA7' : undefined,
                    }}
                  />
                </div>
                {fieldErrors.email && (
                  <div className="text-xs text-red-600 mt-1">{fieldErrors.email[0]}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#112D4E' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                    style={{ 
                      borderColor: formData.password ? '#4A7BA7' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="text-xs text-red-600 mt-1">{fieldErrors.password[0]}</div>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#112D4E' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none transition-all"
                      style={{ 
                        borderColor: formData.confirmPassword ? '#4A7BA7' : undefined,
                      }}
                    />
                  </div>
                  {fieldErrors.password && (
                    <div className="text-xs text-red-600 mt-1">{fieldErrors.password[0]}</div>
                  )}
                </div>
              )}

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded"
                      style={{ accentColor: '#4A7BA7' }}
                    />
                    <span className="text-sm text-gray-600">Remember me</span>
                  </label>
                  <a href="#" className="text-sm font-semibold hover:underline" style={{ color: '#4A7BA7' }}>
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-4 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg transform hover:scale-[1.02] flex items-center justify-center space-x-2"
                style={{ backgroundColor: '#4A7BA7' }}
              >
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight size={20} />
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">or continue with</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                className="py-3 px-4 border-2 border-gray-200 rounded-lg font-medium hover:border-gray-300 transition-all flex items-center justify-center space-x-2"
                style={{ color: '#112D4E' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Google</span>
              </button>
              <button 
                className="py-3 px-4 border-2 border-gray-200 rounded-lg font-medium hover:border-gray-300 transition-all flex items-center justify-center space-x-2"
                style={{ color: '#112D4E' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            {/* Terms */}
            {!isLogin && (
              <p className="mt-6 text-xs text-center text-gray-500">
                By signing up, you agree to our{' '}
                <a href="#" className="font-semibold hover:underline" style={{ color: '#4A7BA7' }}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-semibold hover:underline" style={{ color: '#4A7BA7' }}>
                  Privacy Policy
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
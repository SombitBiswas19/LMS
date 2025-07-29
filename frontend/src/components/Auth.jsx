import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {toast} from 'react-hot-toast';
import { authAPI, setAuthToken, handleApiError } from '../services/api';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  GraduationCap,
  CheckCircle,
  XCircle,
  Loader2,
  Github,
  ArrowRight,
  Shield
} from 'lucide-react';

// A placeholder for the Google icon, as it's not available in lucide-react.
// You can replace this with an SVG or an icon from another library like 'react-icons'.
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.3v2.84C4.02 21.18 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.3C1.48 8.88 1 10.4 1 12s.48 3.12 1.3 4.93l3.54-2.84z" fill="#FBBC05" />
    <path d="M12 5.16c1.58 0 2.98.55 4.08 1.58l3.15-3.15C17.45 1.99 14.97 1 12 1 7.7 1 4.02 2.82 2.3 5.85l3.54 2.84C6.71 6.21 9.14 5.16 12 5.16z" fill="#EA4335" />
  </svg>
);


const Auth = ({ mode = 'login', onLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { register, handleSubmit, formState: { errors }, watch } = useForm();
  const watchPassword = watch('password', '');

  // Redirect path after login
  const from = location.state?.from?.pathname || '/dashboard';

  // Password strength calculation
  useEffect(() => {
    if (mode === 'signup' && watchPassword) {
      const strength = calculatePasswordStrength(watchPassword);
      setPasswordStrength(strength);
    }
  }, [watchPassword, mode]);

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthColor = (strength) => {
    switch (strength) {
      case 0:
      case 1: return 'bg-red-500';
      case 2: return 'bg-orange-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-blue-500';
      case 5: return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const getPasswordStrengthText = (strength) => {
    switch (strength) {
      case 0:
      case 1: return 'Very Weak';
      case 2: return 'Weak';
      case 3: return 'Fair';
      case 4: return 'Good';
      case 5: return 'Strong';
      default: return '';
    }
  };

  const passwordRequirements = [
    { text: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
    { text: 'One uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
    { text: 'One lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
    { text: 'One number', test: (pwd) => /[0-9]/.test(pwd) },
    { text: 'One special character', test: (pwd) => /[^A-Za-z0-9]/.test(pwd) }
  ];

  const onSubmit = async (data) => {
    setLoading(true);

    try {
      if (mode === 'login') {
        const response = await authAPI.login(data.email, data.password);
setAuthToken(response.access_token);

          if (response.user) {
            onLogin(response.user);
            toast.success(`Welcome back, ${response.user.full_name}!`);
          } else {
            toast.success("Welcome back!");
          }
        navigate(from, { replace: true });
      } else {
        await authAPI.signup({
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          role: data.role || 'student'
        });

        toast.success('Account created successfully! Please login.');
        navigate('/login');
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    try {
      const credentials = {
        student: { email: 'student@demo.com', password: 'password123' },
        admin: { email: 'admin@demo.com', password: 'password123' }
      };

      const response = await authAPI.login(credentials[role].email, credentials[role].password);
      setAuthToken(response.access_token);

      onLogin(response.user);
      toast.success(`Demo ${role} login successful!`);
      navigate(from, { replace: true });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="mb-8">
            <GraduationCap className="h-20 w-20 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Smart E-Learning</h1>
          <p className="text-xl text-center mb-8 text-blue-100">
            AI-powered learning platform with personalized recommendations
          </p>
          <div className="grid grid-cols-1 gap-4 max-w-md">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Personalized AI recommendations</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Real-time progress tracking</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Interactive video learning</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span>Advanced analytics dashboard</span>
            </div>
          </div>
        </div>

        {/* Floating elements for visual appeal */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white opacity-10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-white opacity-5 rounded-full animate-bounce"></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-white opacity-10 rounded-full animate-ping"></div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="lg:hidden mb-6">
              <GraduationCap className="h-12 w-12 text-blue-600 mx-auto" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900">
              {mode === 'login' ? 'Welcome back!' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {mode === 'login' ? (
                <>
                  New to our platform?{' '}
                  <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Sign in here
                  </Link>
                </>
              )}
            </p>
          </div>

          {/* Demo Login Buttons (only on login page) */}
          {mode === 'login' && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 text-center mb-3">Quick demo access:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('student')}
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  <User className="h-4 w-4 mr-2" />
                  Student Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('admin')}
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Demo
                </button>
              </div>
              <div className="mt-4 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Full Name (Sign up only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('full_name', {
                      required: 'Full name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                      validate: (value) => {
                        if (!/^[a-zA-Z\s]+$/.test(value)) {
                          return 'Name can only contain letters and spaces';
                        }
                        return true;
                      }
                    })}
                    className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" />
                    {errors.full_name.message}
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Please enter a valid email address'
                    }
                  })}
                  type="email"
                  className="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XCircle className="h-4 w-4 mr-1" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                    validate: mode === 'signup' ? (value) => {
                      if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
                      if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
                      if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
                      return true;
                    } : undefined
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="appearance-none relative block w-full pl-10 pr-12 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                  onFocus={() => mode === 'signup' && setShowPasswordRequirements(true)}
                  onBlur={() => setShowPasswordRequirements(false)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator (Sign up only) */}
              {mode === 'signup' && watchPassword && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength)}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                </div>
              )}

              {/* Password Requirements (Sign up only) */}
              {mode === 'signup' && showPasswordRequirements && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password requirements:</p>
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {req.test(watchPassword) ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-gray-400" />
                        )}
                        <span className={`text-xs ${req.test(watchPassword) ? 'text-green-700' : 'text-gray-600'}`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <XCircle className="h-4 w-4 mr-1" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Role (Sign up only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  I am a *
                </label>
                <select
                  {...register('role')}
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="student">Student - Learn and grow</option>
                  <option value="admin">Administrator - Manage platform</option>
                </select>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  {loading ? (
                    <Loader2 className="h-5 w-5 text-blue-300 animate-spin" />
                  ) : (
                    <Lock className="h-5 w-5 text-blue-300 group-hover:text-blue-200" />
                  )}
                </span>
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    {mode === 'login' ? 'Sign in' : 'Create account'}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Terms and Privacy (Sign up only) */}
            {mode === 'signup' && (
              <div className="text-center">
                <p className="text-xs text-gray-600">
                  By creating an account, you agree to our{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            )}
          </form>

          {/* Additional Login Options */}
          {mode === 'login' && (
            <div className="mt-6">
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>
          )}

          {/* Social Login (Future Enhancement) */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                disabled
              >
                <Github className="h-5 w-5" />
                <span className="ml-2">GitHub</span>
              </button>

              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                disabled
              >
                <GoogleIcon />
                <span className="ml-2">Google</span>
              </button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              Social login coming soon
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Secure & Private</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Your data is encrypted and protected. We never share your personal information with third parties.
                </p>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="mt-6 lg:hidden">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Why choose our platform?</h3>
            <div className="space-y-2">
              {[
                'AI-powered personalized learning',
                'Interactive video content',
                'Progress tracking & analytics',
                'Mobile-friendly design'
              ].map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

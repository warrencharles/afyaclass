import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

import { Alert } from '../../components/ui/Alert';
import { User, Mail, Smartphone, Building, KeyRound, CheckCircle, ChevronRight, ChevronLeft, Lock } from 'lucide-react';
import { ClassType, Class } from '../../types';
import { fetchClasses } from '../../utils/api';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [college, setCollege] = useState('');
  const [classType, setClassType] = useState<string>(''); // Changed to string to hold classCode
  const [otp, setOtp] = useState(''); // New state for OTP
  const [formError, setFormError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const { register, isLoading, error, clearError, verifyOtpLogin, resendOtp, otpVerifiedSuccessfully } = useAuth(); // Added otpVerifiedSuccessfully
  const [classes, setClasses] = useState<Class[]>([]); // State to hold fetched classes
  const [isClassesLoading, setIsClassesLoading] = useState(false); // Loading state for classes
  const [resendCooldown, setResendCooldown] = useState(0); // Keep local cooldown for resend button
  const navigate = useNavigate();

  // Effect to handle successful OTP verification and redirection
  useEffect(() => {
    if (otpVerifiedSuccessfully) {
      navigate('/login', { replace: true });
    }
  }, [otpVerifiedSuccessfully, navigate]);

  // Fetch classes on component mount
  useEffect(() => {
    const loadClasses = async () => {
      setIsClassesLoading(true);
      try {
        const data: Class[] = await fetchClasses(); // Use the directly imported fetchClasses
        setClasses(data);
        if (data.length > 0 && !classType) {
          setClassType(data[0].classCode); // Set initial classType if options are available
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        setFormError('Failed to load program options.');
      } finally {
        setIsClassesLoading(false);
      }
    };
    loadClasses();
  }, []); // Empty dependency array means this runs once on mount

  // Map fetched classes to options for the Select component
  const classOptions = Array.isArray(classes) ? classes.map(cls => ({
    value: cls.classCode,
    label: cls.name,
  })) : [];

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const nextStep = () => {
    setFormError(null);
    clearError();

    if (currentStep === 1) {
      if (!email.trim() || !username.trim() || !phone.trim()) {
        setFormError('Please fill out all fields to continue');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setFormError('Please enter a valid email address');
        return;
      }
      if (!email.endsWith('@gmail.com')) {
        setFormError('Only Gmail accounts are allowed for registration.');
        return;
      }
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
        setFormError('Please enter a valid phone number (10-15 digits)');
        return;
      }
    } else if (currentStep === 2) {
      if (!college.trim() || !classType) {
        setFormError('Please fill out all fields to continue');
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    setFormError(null);
    setCurrentStep(currentStep - 1);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!password.trim() || !confirmPassword.trim()) {
      setFormError('Please fill out all password fields');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }

    try {
      const selectedClass = classes.find(cls => cls.classCode === classType);
      const classTypeNameFull = selectedClass ? selectedClass.name : classType; // Use class name as full type name

      await register({
        email,
        username,
        password,
        college,
        classType: classType as ClassType, // Cast to ClassType
        classTypeNameFull: classTypeNameFull, // Pass the full program name
        phone,
        classLevel: '',
      });
      // Registration successful, move to OTP verification step
      setCurrentStep(4); // Move to the OTP verification step
    } catch (err: any) {
      console.error('Registration failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred during registration.';
      setFormError(errorMessage);
      // Ensure we stay on the current step if registration fails, so the error message is visible
      // If currentStep is 3, it will remain 3 and the error will be displayed.
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!otp.trim()) {
      setFormError('Please enter the OTP.');
      return;
    }

    try {
      // Use the verifyOtpLogin from AuthContext
      await verifyOtpLogin(otp);
      // If successful, AuthContext will set otpVerifiedSuccessfully and show a toast,
      // and handle the navigation to the login page.
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred during OTP verification.';
      setFormError(errorMessage);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setFormError(null);
    try {
      // Use the resendOtp from AuthContext
      await resendOtp(email);
      // AuthContext will show a toast message.
      setResendCooldown(120); // Start 2-minute cooldown
    } catch (err: any) {
      console.error('Resend OTP failed:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to resend OTP. Please try again later.';
      setFormError(errorMessage);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center">
          {[1, 2, 3, 4].map((step, index) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${currentStep >= step
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-400'
                }`}>
                {step}
              </div>
              {index < 3 && (
                <div className={`w-8 h-0.5 mx-1 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <Input
              label="Email Address"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              placeholder="your.email@example.com"
              icon={<Mail size={16} className="text-gray-400" />}
              className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
            />
            <Input
              label="Username"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              placeholder="Choose a unique username"
              icon={<User size={16} className="text-gray-400" />}
              className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
            />
            <Input
              label="Phone Number"
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              placeholder="+1234567890"
              icon={<Smartphone size={16} className="text-gray-400" />}
              className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
            />
            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={nextStep}
                className="group relative px-8 py-3 neu-pressed rounded-full text-blue-600 font-bold hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center justify-center text-sm">
                  Next Step <ChevronRight size={18} className="ml-2 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Input
              label="College/Institution"
              id="college"
              type="text"
              value={college}
              onChange={(e) => setCollege(e.target.value)}
              fullWidth
              placeholder="Enter your college or institution name"
              icon={<Building size={16} className="text-gray-400" />}
              className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
            />
            <Select
              label="Select Your Program"
              id="classType"
              options={classOptions}
              value={classType}
              onChange={(value) => setClassType(value)}
              disabled={isLoading || isClassesLoading}
            />
            <div className="flex justify-between pt-4 gap-3">
              <button
                type="button"
                onClick={prevStep}
                className="group relative px-4 py-2.5 bg-white/50 backdrop-blur-sm text-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 neumorphic-card border border-white/20"
              >
                <span className="flex items-center justify-center font-medium text-sm">
                  <ChevronLeft size={16} className="mr-2 transition-transform text-blue-500" /> Previous
                </span>
              </button>
              <button
                type="button"
                onClick={nextStep}
                disabled={classOptions.length === 0 || isClassesLoading}
                className="group relative px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center text-sm font-semibold">
                  Next Step <ChevronRight size={18} className="ml-2 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              placeholder="Create a strong password"
              icon={<KeyRound size={16} className="text-gray-400" />}
              className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
            />
            <Input
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              placeholder="Confirm your password"
              icon={<KeyRound size={16} className="text-gray-400" />}
              className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
            />
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-700">
              <p className="font-medium mb-0.5">Password Requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>At least 6 characters long</li>
                <li>Mix of letters, numbers, and symbols</li>
                <li>Avoid common passwords</li>
              </ul>
            </div>
            <div className="flex justify-between pt-4 gap-3">
              <button
                type="button"
                onClick={prevStep}
                className="group relative px-4 py-2.5 bg-white/50 backdrop-blur-sm text-gray-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 neumorphic-card border border-white/20"
              >
                <span className="flex items-center justify-center font-medium text-sm">
                  <ChevronLeft size={16} className="mr-2 transition-transform text-blue-500" /> Previous
                </span>
              </button>
              <button
                type="submit"
                disabled={isLoading || isClassesLoading}
                className="group relative px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 neumorphic-button disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handleRegisterSubmit}
              >
                <span className="flex items-center justify-center text-sm font-semibold">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="mr-2 transition-transform" />
                      Create Account
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        );
      case 4: // OTP verification step
        return (
          <div className="space-y-4">
            {/* The message is now displayed here, directly before the OTP input */}
            <p className="text-center text-gray-700 mb-4">
              Your email is not yet confirmed. A new OTP has been sent. Please check your email and enter the OTP below.
            </p>
            <Input
              label="One-Time Password (OTP)"
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              fullWidth
              placeholder="Enter 6-digit OTP"
              icon={<Lock size={16} className="text-gray-400" />}
              className="neu-pressed !bg-[#ebf5fc] !border-none !shadow-none focus:!ring-0 rounded-xl"
              maxLength={6}
            />
            <div className="flex justify-between pt-4 gap-3">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="group relative flex-1 px-4 py-2.5 bg-white/50 backdrop-blur-sm text-gray-700 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 neumorphic-card border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center justify-center font-medium text-sm">
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend OTP'}
                </span>
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex-1 px-4 py-3 neu-pressed rounded-full text-blue-600 font-bold hover:scale-105 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                onClick={handleOtpVerification}
              >
                <span className="flex items-center justify-center text-sm font-semibold">
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-b-transparent mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} className="mr-2 transition-transform" />
                      Verify
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };



  return (
    <div className="flex flex-col min-h-screen bg-[#ebf5fc] relative overflow-hidden font-sans">
      <Navbar />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-xs space-y-3">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Create your account
            </h2>
            <p className="text-sm text-gray-600">
              Join AfyaClass
            </p>
          </div>

          {/* Render Error Alerts */}
          {(error || formError) && (
            <div className="animate-fadeIn">
              <Alert
                variant="error"
                message={formError || error || 'An error occurred'}
                onClose={() => {
                  setFormError(null);
                  clearError();
                }}
              />
            </div>
          )}

          {/* Neumorphic Register Card - High Contrast */}
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] border border-white/50 transition-all duration-500 relative">
            {renderStepIndicator()}

            {/* The form itself, which renders content based on currentStep */}
            <form className="space-y-3" onSubmit={currentStep === 4 ? handleOtpVerification : handleRegisterSubmit}>
              {renderStepContent()}
            </form>

            <div className="mt-4 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white/80 text-gray-500 font-medium">Already have an account?</span>
                </div>
              </div>
              <div className="mt-4">
                <Link to="/login">
                  <button className="w-full group relative px-4 py-3 neu-flat rounded-xl text-gray-600 font-bold hover:text-blue-600 transition-all duration-300 hover:scale-105">
                    <span className="flex items-center justify-center font-medium text-sm">
                      Sign in instead
                      <ChevronRight size={16} className="ml-2 transition-transform text-blue-500" />
                    </span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

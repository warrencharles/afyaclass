import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import {
  BookOpen, ArrowRight, Stethoscope,
  Shield, CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-[#ebf5fc] overflow-x-hidden font-sans selection:bg-blue-200">

      <Navbar />

      <main className="flex-grow relative z-10 pt-24 pb-16 lg:pt-32">

        {/* HERO SECTION */}
        <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">

          {/* 3D Decorative Floating Orbs (Optimized for Mobile) */}
          <div className="absolute top-4 -left-2 w-14 h-14 sm:top-10 sm:left-[10%] sm:w-24 sm:h-24 neu-convex flex items-center justify-center text-blue-500 neu-float opacity-50 sm:opacity-80 z-0">
            <BookOpen size={28} className="sm:w-10 sm:h-10" />
          </div>
          <div className="absolute top-12 -right-2 w-16 h-16 sm:top-20 sm:right-[10%] sm:w-28 sm:h-28 neu-convex flex items-center justify-center text-purple-500 neu-float opacity-50 sm:opacity-80 z-0" style={{ animationDelay: '2s' }}>
            <Shield size={32} className="sm:w-12 sm:h-12" />
          </div>
          <div className="absolute bottom-1/3 -left-2 w-12 h-12 sm:bottom-1/4 sm:left-[15%] sm:w-20 sm:h-20 neu-convex flex items-center justify-center text-green-500 neu-float opacity-50 sm:opacity-80 z-0" style={{ animationDelay: '4s' }}>
            <CheckCircle size={24} className="sm:w-8 sm:h-8" />
          </div>

          {/* Badge */}
          <div className="relative z-10 neu-pressed px-6 py-2 rounded-full mb-8 flex items-center gap-3 animate-slideUp">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Stethoscope size={16} className="text-white" />
            </div>
            <span className="text-blue-800 font-bold tracking-wide text-sm uppercase">Afya Class Hub</span>
          </div>

          {/* Headline - "color" Effect as requested */}
          <h1 className="relative z-10 text-4xl sm:text-6xl md:text-7xl font-black tracking-tight mb-8 max-w-4xl mx-auto animate-slideUp" style={{ animationDelay: '0.1s' }}>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 drop-shadow-sm">
              Master Health
            </span> <br className="hidden sm:block" />
            <span className="text-blue-600/90 text-neu-pop">Sciences</span>
          </h1>

          <p className="relative z-10 text-lg sm:text-2xl text-neu-pop font-medium max-w-2xl mx-auto mb-12 leading-relaxed animate-slideUp px-4" style={{ animationDelay: '0.2s' }}>
            The premium digital companion for medical education.
            Curated notes, exams, and lectures in one tactile space.
          </p>

          {/* Action Buttons */}
          <div className="relative z-10 flex flex-wrap gap-6 justify-center animate-slideUp" style={{ animationDelay: '0.3s' }}>
            {isAuthenticated ? (
              <Link to="/dashboard">
                <button className="neu-pressed px-8 py-4 rounded-full flex items-center gap-3 text-lg font-bold text-blue-600 group transition-all duration-300 hover:scale-105">
                  Go to Dashboard
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <button className="neu-pressed px-8 py-4 rounded-full flex items-center gap-3 text-lg font-bold text-blue-600 group transition-all duration-300 hover:scale-105">
                    Start Learning Free
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link to="/login">
                  <button className="neu-pressed px-8 py-4 rounded-full text-lg font-bold text-gray-600 hover:text-blue-600 transition-all duration-300 hover:scale-105">
                    Log In
                  </button>
                </Link>
              </>
            )}
          </div>

        </section>

        {/* FEATURES - "Tilt" Cards */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-700 mb-2">Why Choose Us?</h2>
            <div className="h-1.5 w-24 bg-blue-500 rounded-full mx-auto neu-pressed"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'Curated Library', desc: 'Verified notes specific to your NACTVET level.', color: 'text-blue-600' },
              { icon: Shield, title: 'Exam Prep', desc: 'Past papers and structured guides.', color: 'text-purple-600' },
              { icon: CheckCircle, title: 'Anytime Access', desc: 'Study 24/7 on any device.', color: 'text-pink-600' },
            ].map((f, i) => (
              <div key={i} className="neu-flat p-8 flex flex-col items-center text-center neu-tilt group cursor-default">
                <div className={`w-20 h-20 neu-concave rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className={`w-10 h-10 ${f.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* STATS - "Dashboard" Panel */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto neu-pressed p-8 sm:p-12 rounded-[3rem]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: "Students", val: "10k+" },
                { label: "Resources", val: "500+" },
                { label: "Institutions", val: "50+" },
                { label: "Satisfaction", val: "99%" }
              ].map((stat, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-3xl sm:text-5xl font-black text-gray-700 mb-2" style={{ textShadow: '2px 2px 4px rgba(255,255,255,1), -2px -2px 4px rgba(0,0,0,0.1)' }}>
                    {stat.val}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center">
          {!isAuthenticated && (
            <div className="inline-block neu-flat p-10 sm:p-16 rounded-[3rem] mx-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-purple-500"></div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-6">Ready to Excel?</h2>
              <Link to="/register">
                <button className="neu-icon-btn w-20 h-20 mx-auto rounded-full text-blue-600 group-hover:scale-110">
                  <ArrowRight size={32} />
                </button>
              </Link>
              <p className="mt-4 font-bold text-gray-500">Join Free Today</p>
            </div>
          )}
        </section>

      </main>
      <Footer />
    </div>
  );
};

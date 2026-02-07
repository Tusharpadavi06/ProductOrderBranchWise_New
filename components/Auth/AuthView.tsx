import React, { useState } from 'react';
import { Mail, Lock, MapPin, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { toast } from 'react-hot-toast';
import { BRANCHES } from '../../constants';

export const AuthView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    branch: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        toast.success('Successfully logged in');
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (!formData.branch) {
          throw new Error('Please select a branch');
        }

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName,
              branch: formData.branch
            }
          }
        });
        if (error) throw error;
        toast.success('Registration successful! Please check your email.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-indigo-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/40 rounded-full blur-3xl"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-3 rounded-3xl shadow-xl shadow-blue-200/50 border border-blue-50">
            <img 
              src="https://www.ginzalimited.com/cdn/shop/files/Ginza_logo.jpg?v=1668509673&width=500" 
              alt="Ginza Industries" 
              className="h-16 object-contain"
            />
          </div>
        </div>
        
        <h2 className="text-center text-3xl sm:text-4xl font-black text-blue-600 tracking-tight leading-tight">
          ORDER MANAGEMENT <br className="hidden sm:block" /> PORTAL
        </h2>
        
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-px w-8 bg-blue-200"></div>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.25em] flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Secure Access Only
          </p>
          <div className="h-px w-8 bg-blue-200"></div>
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/90 backdrop-blur-xl py-10 px-6 sm:px-12 shadow-[0_32px_64px_-12px_rgba(59,130,246,0.15)] sm:rounded-[2.5rem] border border-white">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">First Name</label>
                  <input
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Tushar"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">Last Name</label>
                  <input
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="Padavi"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">Work Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="name@ginzalimited.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="block w-full pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1">Base Branch</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
                    <select
                      name="branch"
                      required
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="block w-full pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option value="">-- Choose Branch --</option>
                      {BRANCHES.map((b: string) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-4.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200 text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-50">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="w-full flex flex-col items-center gap-1 group"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isLogin ? "Need new portal access?" : "Already have an account?"}
              </span>
              <span className="text-sm font-black text-blue-600 group-hover:text-blue-700 transition-colors">
                {isLogin ? 'REQUEST ACCOUNT' : 'BACK TO LOGIN'}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            © 2025 Ginza Industries Limited
          </p>
        </div>
      </div>
    </div>
  );
};
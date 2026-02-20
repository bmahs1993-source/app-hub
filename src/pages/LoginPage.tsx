import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Fingerprint, Chrome } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { base64ToBuffer, generateRandomChallenge } from '../lib/webauthn';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if biometric auth is supported
    if (window.PublicKeyCredential) {
      setIsBiometricSupported(true);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const storedCredJson = localStorage.getItem('nexus_biometric_cred');
      
      if (!storedCredJson) {
        throw new Error('No biometric enrollment found. Please sign in with password first to enroll.');
      }

      const storedCred = JSON.parse(storedCredJson);
      const challenge = generateRandomChallenge();

      const options: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: base64ToBuffer(storedCred.credentialId),
          type: "public-key",
        }],
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = (await navigator.credentials.get({
        publicKey: options,
      })) as PublicKeyCredential;

      if (!assertion) throw new Error('Biometric verification failed');

      // In a real app, you'd send the assertion to your server to verify the signature
      // For this demo, we'll assume success if the browser returns a valid assertion
      console.log('Biometric assertion received:', assertion);
      
      localStorage.setItem('nexus_demo_session', 'true');
      navigate('/admin');
    } catch (err: any) {
      console.error('Biometric login error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Biometric verification cancelled.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      navigate('/admin');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      
      // For demo purposes, if Supabase is not fully configured, allow bypass with specific credentials
      if (email === 'admin@nexus.com' && password === 'password123') {
        setError(null);
        localStorage.setItem('nexus_demo_session', 'true');
        navigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-2xl mb-6 shadow-lg shadow-brand-500/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white mb-2">Admin Portal</h1>
            <p className="text-neutral-400">Secure access to Nexus App Store management.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                  placeholder="admin@nexus.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center group"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-900 px-2 text-neutral-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-semibold transition-all"
              >
                <Chrome className="w-5 h-5" />
                Google
              </button>
              <button
                onClick={handleBiometricLogin}
                disabled={loading || !isBiometricSupported}
                className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-semibold transition-all disabled:opacity-30"
              >
                <Fingerprint className="w-5 h-5" />
                Biometric
              </button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-neutral-500 text-sm">
              Forgot your credentials? <button className="text-brand-500 hover:underline">Contact System Admin</button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

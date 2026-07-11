"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { api } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Create User in Firebase Auth
      await createUserWithEmailAndPassword(auth, email, password);

      // 2. Create profile in Firestore via our backend
      await api.post("/users/profile", {
        name,
        role,
      });

      // 3. Redirect to Dashboard
      router.push(`/${role}/dashboard`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300">
      
      {/* Header with Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Dynamic Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/30 dark:bg-indigo-900/40 blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/20 dark:bg-cyan-900/30 blur-[150px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white dark:bg-slate-900/50 p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl border border-slate-200 dark:border-white/10 relative z-10 my-8 transition-colors">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6 group">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform">
              <Activity className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Create an account
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors">
              Sign in instead
            </Link>
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-100 dark:bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="name">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 py-3 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-all outline-none"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 py-3 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-all outline-none"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 py-3 px-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="role">I am a</label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-950/50 py-3 px-4 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:text-sm transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="patient" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Patient</option>
                <option value="doctor" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Doctor</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:from-cyan-400 hover:to-blue-500 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { 
  Activity, ShieldAlert, Brain, 
  Stethoscope, FileText, ArrowRight,
  Database, Lock, Eye, 
  Mic, Search, ActivitySquare
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Home() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-50 selection:bg-cyan-500/30 font-sans overflow-hidden transition-colors duration-300">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-40 pointer-events-none mix-blend-multiply dark:mix-blend-screen">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/40 dark:bg-indigo-900/40 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/30 dark:bg-cyan-900/30 blur-[150px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-slate-200 dark:border-white/5 backdrop-blur-xl bg-white/70 dark:bg-slate-950/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              CareLink
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link 
              href="/login" 
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-semibold mb-8 uppercase tracking-wider">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Responsible Medical AI
            </motion.div>
            
            <motion.h1 
              variants={fadeIn}
              className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]"
            >
              AI-Powered Diagnostics & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-blue-500 dark:to-indigo-500">
                Proactive Health Companion
              </span>
            </motion.h1>
            
            <motion.p 
              variants={fadeIn}
              className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Bridging the gap between doctors and patients with honest AI. We provide clinical-grade X-ray analysis for providers and a voice-first, empathetic health buddy for patients.
            </motion.p>
            
            <motion.div 
              variants={fadeIn}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center group"
              >
                Access Portals
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* The Problem / Solution Section */}
        <section className="py-24 border-y border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-slate-900/20 backdrop-blur-md px-6 transition-colors duration-300">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why CareLink?</h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Moving beyond black-box algorithms and disconnected data to deliver trustworthy, explainable, and proactive healthcare.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-colors group shadow-sm dark:shadow-none">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Brain className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Explainable & Honest AI</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We don't just output a confidence number. Our models compute entropy and image sharpness, honestly flagging when interpretations are uncertain.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-blue-500/30 transition-colors group shadow-sm dark:shadow-none">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Hallucination-Free Q&A</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Patient questions are grounded in curated medical knowledge (RAG). AI answers strictly from authoritative sources with visible citations.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-colors group shadow-sm dark:shadow-none">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center mb-6 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <ActivitySquare className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Longitudinal Intelligence</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  We track patient health over time, comparing multiple reports to identify trends and proactive insights, not just single-point snapshots.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dual Interfaces / Bento Box */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-20">One Platform. Two Specialized Experiences.</h2>
            
            {/* For Doctors */}
            <div className="mb-24">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold">For Doctors: AI Radiologist Assistant</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 p-8 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 overflow-hidden relative group transition-colors shadow-sm dark:shadow-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all duration-500 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/20"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100 dark:bg-purple-500/10 rounded-full blur-3xl -ml-20 -mb-20 transition-all duration-500 group-hover:bg-purple-200 dark:group-hover:bg-purple-500/20"></div>
                  <div className="relative z-10">
                    <Eye className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-6" />
                    <h4 className="text-2xl font-bold mb-2">X-ray Anomaly Detection</h4>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md">Our custom CNN (DenseNet121 + Grad-CAM) identifies suspicious regions, draws bounding boxes, and generates structured clinical impressions.</p>
                  </div>
                </div>
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 relative overflow-hidden group shadow-sm dark:shadow-none transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 dark:bg-red-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-red-200 dark:group-hover:bg-red-500/20"></div>
                  <ShieldAlert className="w-8 h-8 text-rose-500 dark:text-rose-400 mb-6 relative z-10" />
                  <h4 className="text-xl font-bold mb-2 relative z-10">Uncertainty Calibration</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 relative z-10">Displays reliability badges based on prediction entropy and image blur detection.</p>
                </div>
              </div>
            </div>

            {/* For Patients */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                  <Mic className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold">For Patients: Voice-First Health Buddy</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 relative overflow-hidden group shadow-sm dark:shadow-none transition-colors">
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-100 dark:bg-cyan-500/10 rounded-full blur-3xl -ml-10 -mb-10 transition-all group-hover:bg-cyan-200 dark:group-hover:bg-cyan-500/20"></div>
                  <FileText className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mb-6 relative z-10" />
                  <h4 className="text-xl font-bold mb-2 relative z-10">Report Demystifier & OCR</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 relative z-10">Upload a photo of your paper report or paste text. Our AI uses optical character recognition (OCR) to extract and translate complex medical jargon into plain, reassuring language at a 6th-grade reading level.</p>
                </div>
                <div className="md:col-span-2 p-8 rounded-3xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 overflow-hidden relative group transition-colors shadow-sm dark:shadow-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100 dark:bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all duration-500 group-hover:bg-cyan-200 dark:group-hover:bg-cyan-500/20"></div>
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 dark:bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 transition-all duration-500 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20"></div>
                  <div className="relative z-10">
                    <Activity className="w-8 h-8 text-red-500 dark:text-red-400 mb-6 animate-pulse" />
                    <h4 className="text-2xl font-bold mb-2">Proactive Safety Alerts</h4>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md">Combines browser accelerometer data for fall detection with voice-triggered SOS to instantly alert connected doctors via real-time WebSockets.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-24 border-y border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/50 px-6 transition-colors duration-300">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-sm font-bold tracking-widest text-slate-500 uppercase mb-8">Enterprise-Grade Architecture</h2>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded bg-slate-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-xs">N</div><span className="font-semibold text-lg text-slate-900 dark:text-white">Next.js</span></div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white"><Database className="w-6 h-6" /><span className="font-semibold text-lg">Firebase</span></div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white"><Brain className="w-6 h-6" /><span className="font-semibold text-lg">TensorFlow</span></div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white"><Lock className="w-6 h-6" /><span className="font-semibold text-lg">FAISS</span></div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white"><Activity className="w-6 h-6" /><span className="font-semibold text-lg">Socket.io</span></div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-white/10 text-center text-slate-500 text-sm relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-6">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">CareLink</span>
            <span className="ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</a>
            <a href="https://github.com/carelink" className="hover:text-slate-900 dark:hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

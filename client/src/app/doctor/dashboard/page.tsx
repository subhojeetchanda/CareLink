"use client";

import { useAuth, api } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import toast, { Toaster } from 'react-hot-toast';
import { Bell, UploadCloud, X, Eye, ShieldAlert, Activity, Calendar, FileText, ActivitySquare, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import AIDisclaimer from '@/components/AIDisclaimer';
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";

interface Appointment {
  id: string;
  patientId: string;
  date: string;
  notes: string;
}

interface Uncertainty {
  entropy: number;
  margin: number;
  sharpness_variance: number;
  is_blurry: boolean;
  reliability_level: 'high' | 'moderate' | 'low';
  message: string;
}

interface ImageRecord {
  id: string;
  patientId: string;
  imageUrl: string;
  anomalies: any[];
  explanation?: string;
  uncertainty?: Uncertainty;
}

export default function DoctorDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  const [patientId, setPatientId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);

  const [editingExplanationId, setEditingExplanationId] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchData();
    }
  }, [user, loading, router]);

  const fetchData = async () => {
    try {
      const apptRes = await api.get("/appointments").catch(e => ({ data: [] }));
      const imgRes = await api.get("/images").catch(e => ({ data: [] }));
      const alertRes = await api.get("/alerts").catch(e => ({ data: [] }));
      
      setAppointments(apptRes.data);
      setImages(imgRes.data);
      setAlerts(alertRes.data);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error("Failed to load dashboard data");
    }
  };

  useEffect(() => {
    let socket: any;
    const initSocket = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5001";
          socket = io(backendUrl, {
            auth: { token }
          });
          
          socket.on("connect", () => {
            console.log("Doctor connected to real-time alerts server");
          });

          socket.on("new-alert", (alert: any) => {
            console.log("New alert received!", alert);
            setAlerts(prev => {
              if (prev.some(a => a.id === alert.id)) return prev;
              setTimeout(() => {
                toast.error("🚨 New Emergency Alert!", { duration: 10000 });
              }, 0);
              return [alert, ...prev];
            });
          });

          socket.on("new-appointment", (appointment: any) => {
            console.log("New appointment received!", appointment);
            setAppointments(prev => {
              if (prev.some(a => a.id === appointment.id)) return prev;
              setTimeout(() => {
                toast.success("📅 New Appointment Booked!", { duration: 5000 });
              }, 0);
              return [appointment, ...prev];
            });
          });

          socket.on('delete-appointment', (apptId: string) => {
            setAppointments(prev => prev.filter(a => a.id !== apptId));
          });
        } catch (error) {
          console.error("Socket connection failed", error);
        }
      }
    };
    initSocket();
    
    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return;
    setIsDeletingImage(true);
    try {
      await api.delete(`/images/${imageToDelete}`);
      setImages(images.filter(img => img.id !== imageToDelete));
      setImageToDelete(null);
      toast.success("X-Ray deleted");
    } catch (error) {
      console.error("Failed to delete image", error);
      toast.error("Failed to delete the image. Please try again.");
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !patientId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("patientId", patientId);

    try {
      const res = await api.post("/images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setImages([res.data, ...images]);
      setFile(null);
      setPatientId("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("X-Ray uploaded and analyzed successfully!");
    } catch (error) {
      console.error("Failed to upload image", error);
      toast.error("Failed to upload and analyze image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        await api.delete(`/appointments/${apptId}`);
        setAppointments(appointments.filter(a => a.id !== apptId));
        toast.success("Appointment cancelled successfully");
      } catch (error: any) {
        if (error.response?.status === 404) {
          setAppointments(appointments.filter(a => a.id !== apptId));
          toast.success("Appointment was already cancelled.");
        } else {
          console.error("Failed to cancel appointment", error);
          toast.error("Failed to cancel appointment");
        }
      }
    }
  };

  const handleSaveExplanation = async (imgId: string) => {
    try {
      const res = await api.put(`/images/${imgId}`, { explanation: explanationText });
      setImages(images.map(img => img.id === imgId ? { ...img, explanation: res.data.explanation } : img));
      setEditingExplanationId(null);
      toast.success("Explanation updated successfully");
    } catch (error) {
      console.error("Failed to update explanation", error);
      toast.error("Failed to update explanation");
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    setAlerts(alerts.filter(a => a.id !== alertId));
    try {
      await api.put(`/alerts/${alertId}/resolve`);
    } catch (error) {
      console.error("Failed to dismiss alert", error);
      toast.error("Failed to dismiss alert permanently.");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#030712] transition-colors duration-300">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-indigo-500 rounded-full mb-4 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide">Loading Doctor Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-50 font-sans selection:bg-indigo-500/30 overflow-x-hidden transition-colors duration-300">
      <Toaster position="top-center" toastOptions={{ style: { background: 'var(--tw-colors-slate-900)', color: '#fff' } }} />
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30 pointer-events-none mix-blend-multiply dark:mix-blend-screen">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/40 dark:bg-indigo-900/40 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/30 dark:bg-cyan-900/30 blur-[150px]" />
      </div>

      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#030712]/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Doctor Portal
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <div className="relative">
              <Bell className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.6)] border border-white dark:border-[#030712]">
                  {alerts.length}
                </span>
              )}
            </div>
            <button 
              onClick={handleLogout}
              className="px-5 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Modal */}
      {imageToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10 transform transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-6 border border-red-200 dark:border-red-500/30">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Delete X-Ray?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">This action cannot be undone. Are you sure you want to permanently remove this X-Ray record from your history?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setImageToDelete(null)}
                disabled={isDeletingImage}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteImage}
                disabled={isDeletingImage}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isDeletingImage ? (
                   <Activity className="animate-spin h-4 w-4 text-white" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Alerts Overlay */}
      {alerts.length > 0 && (
        <div className="fixed top-24 right-4 z-[120] w-96 space-y-4">
          {alerts.map((alert, idx) => (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              key={alert.id || idx} 
              className="bg-white dark:bg-red-950/80 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-red-200 dark:border-red-500/50 text-slate-900 dark:text-white flex flex-col gap-3 relative shadow-[0_0_30px_rgba(239,68,68,0.1)] dark:shadow-[0_0_30px_rgba(239,68,68,0.3)]"
            >
              <button 
                onClick={() => handleDismissAlert(alert.id)}
                className="absolute top-4 right-4 text-slate-400 dark:text-red-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center border border-red-200 dark:border-red-500/30">
                  <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-red-600 dark:text-red-400">{alert.type === "FALL" ? "Fall Detected!" : "EMERGENCY SOS"}</h3>
                  <p className="text-xs text-slate-500 dark:text-red-200/70 font-medium">
                    {new Date(alert.timestamp?._seconds ? alert.timestamp._seconds * 1000 : Date.now()).toLocaleTimeString()} • {alert.patientName || `Patient ${alert.userId.substring(0,6)}`}
                  </p>
                </div>
              </div>
              
              {alert.location && (
                <a 
                  href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                  target="_blank" rel="noreferrer"
                  className="mt-2 w-full px-4 py-2 bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-500/30 transition-colors border border-red-200 dark:border-red-500/30"
                >
                  View Location on Map
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <main className="relative z-10 max-w-7xl mx-auto py-8 px-6 lg:px-8 space-y-8">
        
        {/* Upload Action Bar */}
        <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 relative overflow-hidden group transition-colors duration-300">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 dark:from-indigo-500/20 dark:to-cyan-500/20 blur-3xl transition-opacity duration-500 opacity-50 group-hover:opacity-100"></div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 relative z-10 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Upload Patient X-Ray
          </h2>
          
          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-6 items-end relative z-10">
            <div className="w-full sm:w-1/3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Patient ID</label>
              <input
                type="text"
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. 1357997531"
                className="w-full rounded-xl border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-slate-50 dark:bg-slate-950/50 focus:bg-white dark:focus:bg-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 sm:text-sm p-3 transition-all outline-none"
              />
            </div>
            <div className="w-full sm:w-1/3">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">X-Ray Image File</label>
              <div className="relative">
                <input
                  type="file"
                  required
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-cyan-50 dark:file:bg-cyan-500/10 file:text-cyan-700 dark:file:text-cyan-400 hover:file:bg-cyan-100 dark:hover:file:bg-cyan-500/20 cursor-pointer transition-colors outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isUploading || !file || !patientId}
              className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <Activity className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                  Processing...
                </span>
              ) : "Upload & Analyze"}
            </button>
          </form>
          <div className="mt-6">
            <AIDisclaimer />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Image Records */}
          <section className="lg:col-span-2 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/30">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Analyzed X-Rays
              </h2>
            </div>
            <div className="p-6">
              {images.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 mb-4 border border-slate-200 dark:border-white/5">
                    <Eye className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No images uploaded yet.</p>
                </div>
              ) : (
                <ul className="space-y-6">
                  {images.map((img) => (
                    <li key={img.id} className="flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-cyan-500/30 transition-colors duration-300 relative group shadow-sm dark:shadow-none">
                      
                      <button 
                        onClick={() => setImageToDelete(img.id)}
                        className="absolute top-4 right-4 p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                        title="Delete X-Ray"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      {/* Image Container */}
                      <div className="relative w-full sm:w-72 flex-shrink-0 group overflow-hidden rounded-xl bg-slate-200 dark:bg-black border border-slate-300 dark:border-white/10">
                        <img 
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001'}${img.imageUrl}`} 
                          alt="XRay" 
                          className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105 opacity-90 dark:opacity-80 group-hover:opacity-100"
                        />
                        {/* Overlays */}
                        {img.anomalies && img.anomalies.map((anomaly, idx) => {
                          if (!anomaly.bbox) return null;
                          return (
                            <div 
                              key={idx}
                              className="absolute border-2 border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all duration-300"
                              style={{
                                left: `${anomaly.bbox.x}%`,
                                top: `${anomaly.bbox.y}%`,
                                width: `${anomaly.bbox.width}%`,
                                height: `${anomaly.bbox.height}%`,
                              }}
                            >
                              <span className="absolute -top-7 left-0 bg-white dark:bg-red-950/90 backdrop-blur-sm text-red-600 dark:text-red-400 text-xs px-2 py-1 whitespace-nowrap rounded-md font-bold shadow-lg border border-red-200 dark:border-red-500/50">
                                {anomaly.label === "anomaly" ? "Pneumonia" : anomaly.label} - {Math.round(anomaly.confidence * 100)}%
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Info Panel */}
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="mb-4">
                          <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">Patient ID</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{img.patientId}</p>
                        </div>
                        
                        {!img.anomalies || img.anomalies.length === 0 ? (
                          <div>
                            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-2">Analysis Result</p>
                            <div className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm">
                              <CheckCircle className="w-4 h-4 mr-2 text-emerald-500 dark:text-emerald-400" />
                              No anomalies detected
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Detected Anomalies</p>
                            <div className="flex flex-wrap gap-2">
                              {img.anomalies.map((anomaly, idx) => (
                                <div key={idx} className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 shadow-sm">
                                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                  {anomaly.label === "anomaly" ? "Pneumonia" : anomaly.label} ({Math.round(anomaly.confidence * 100)}%)
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Uncertainty Section */}
                        {img.uncertainty && (
                          <div className="mt-4 space-y-2 p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/50">
                            <div className="flex items-center gap-2 flex-wrap">
                              {img.uncertainty.reliability_level === 'high' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                  High reliability
                                </span>
                              )}
                              {img.uncertainty.reliability_level === 'moderate' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                  Moderate – review carefully
                                </span>
                              )}
                              {img.uncertainty.reliability_level === 'low' && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                                  Low – unreliable
                                </span>
                              )}
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-2">
                                Image: {img.uncertainty.is_blurry ? <span className="text-amber-500 dark:text-amber-400">Blurry</span> : <span className="text-emerald-500 dark:text-emerald-400">Sharp</span>}
                              </span>
                            </div>
                            {img.uncertainty.reliability_level !== 'high' && (
                              <p className="text-xs text-amber-600 dark:text-amber-200/70 font-medium italic">{img.uncertainty.message}</p>
                            )}
                            <p className="text-[10px] text-slate-500 dark:text-slate-600 mt-1 font-mono">
                              Entropy: {img.uncertainty.entropy.toFixed(2)} | Margin: {img.uncertainty.margin.toFixed(2)} | Variance: {img.uncertainty.sharpness_variance.toFixed(0)}
                            </p>
                          </div>
                        )}
                        
                        {/* Explanation Section */}
                        {img.explanation && (
                          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                                <ActivitySquare className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                                AI Report Impression
                              </h4>
                              {editingExplanationId !== img.id && (
                                <button 
                                  onClick={() => { setEditingExplanationId(img.id); setExplanationText(img.explanation || ""); }}
                                  className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                            
                            {editingExplanationId === img.id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={explanationText}
                                  onChange={(e) => setExplanationText(e.target.value)}
                                  className="w-full p-3 text-sm text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-shadow"
                                  rows={4}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button 
                                    onClick={() => setEditingExplanationId(null)}
                                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => handleSaveExplanation(img.id)}
                                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                  {img.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Appointments Section */}
          <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden self-start transition-colors duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/30">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Appointments
              </h2>
            </div>
            <div className="p-6">
              {appointments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 font-medium text-sm">No upcoming appointments.</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {appointments.map((appt) => (
                    <li key={appt.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 hover:border-indigo-500/30 transition-colors group shadow-sm dark:shadow-none">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm border border-indigo-200 dark:border-indigo-500/20">
                          {new Date(appt.date).getDate()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{new Date(appt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(appt.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">Patient ID: <span className="text-slate-900 dark:text-slate-200">{appt.patientId}</span></p>
                      {appt.notes && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 italic mb-3">"{appt.notes}"</p>
                      )}
                      <button 
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="text-xs font-bold text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors flex items-center gap-1 opacity-80 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                        Cancel Appointment
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

"use client";

import { useAuth, api } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import toast, { Toaster } from 'react-hot-toast';
import { Smile, Meh, Frown, ChevronDown, ChevronUp, Activity, Bell, FileText, Calendar as CalendarIcon, ShieldAlert, ActivitySquare, Brain, Eye, X } from 'lucide-react';
import AIDisclaimer from '@/components/AIDisclaimer';
import VoiceAssistant from '@/components/VoiceAssistant';
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from 'framer-motion';

const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface Appointment {
  id: string;
  doctorId: string;
  date: string;
  notes: string;
}

interface Report {
  id: string;
  originalText: string;
  demystifiedText?: string;
  createdAt: any;
}

export default function PatientDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [newReportText, setNewReportText] = useState("");
  const [reportImage, setReportImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const [moods, setMoods] = useState<any[]>([]);
  const [newMood, setNewMood] = useState("");
  const [newMoodNotes, setNewMoodNotes] = useState("");
  const [isSubmittingMood, setIsSubmittingMood] = useState(false);
  
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [sosSuccess, setSosSuccess] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const fallTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Health Trend
  const [trendSummary, setTrendSummary] = useState<string | null>(null);
  const [isFetchingTrend, setIsFetchingTrend] = useState(false);

  // Booking state
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<any>('month');

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
      const reportRes = await api.get("/reports").catch(e => ({ data: [] }));
      const moodRes = await api.get("/moods").catch(e => ({ data: [] }));
      const docsRes = await api.get("/users/doctors").catch(e => ({ data: [] }));

      setAppointments(apptRes.data);
      setReports(reportRes.data);
      setMoods(moodRes.data);
      setDoctorsList(docsRes.data);
    } catch (error: any) {
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
            console.log("Connected to real-time alerts server");
          });
          socket.on('delete-appointment', (apptId: string) => {
            setAppointments(prev => prev.filter(a => a.id !== apptId));
          });
        } catch (error) {
          console.error("Failed to init socket", error);
        }
      }
    };
    initSocket();
    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    let isTrackingFall = false;
    let maxAccelDuringTracking = 0;
    let trackingTimeout: any;

    const handleMotion = (event: DeviceMotionEvent) => {
      const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
      if (x === null || y === null || z === null) return;
      
      const magnitude = Math.sqrt(x*x + y*y + z*z);
      const g = magnitude / 9.81;

      if (!isTrackingFall) {
        if (g > 2.5) {
          isTrackingFall = true;
          maxAccelDuringTracking = 0;
          
          trackingTimeout = setTimeout(() => {
            if (maxAccelDuringTracking < 1.2) {
              setFallDetected(true);
              
              fallTimeoutRef.current = setTimeout(async () => {
                setFallDetected(false);
                try {
                  await api.post("/alerts/fall", { location: null });
                  toast.success("Fall alert sent automatically to doctors.");
                } catch (e) {
                  console.error(e);
                }
              }, 5000);
            }
            isTrackingFall = false;
          }, 2000);
        }
      } else {
        if (g > maxAccelDuringTracking) {
          maxAccelDuringTracking = g;
        }
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      clearTimeout(trackingTimeout);
      if (fallTimeoutRef.current) clearTimeout(fallTimeoutRef.current);
    };
  }, []);

  const cancelFallAlert = () => {
    if (fallTimeoutRef.current) clearTimeout(fallTimeoutRef.current);
    setFallDetected(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportText.trim() && !reportImage) return;

    setIsSubmitting(true);
    try {
      let res;
      if (reportImage) {
        const formData = new FormData();
        formData.append("reportImage", reportImage);
        if (newReportText.trim()) formData.append("originalText", newReportText);
        
        res = await api.post("/reports", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        res = await api.post("/reports", { originalText: newReportText });
      }
      setReports([res.data, ...reports]);
      setNewReportText("");
      setReportImage(null);
      setImagePreview(null);
      toast.success("Report added successfully!");
    } catch (error) {
      console.error("Failed to create report", error);
      toast.error("Failed to create report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/reports/${reportToDelete}`);
      setReports(reports.filter(r => r.id !== reportToDelete));
      setReportToDelete(null);
      toast.success("Report deleted");
    } catch (error) {
      console.error("Failed to delete report", error);
      toast.error("Failed to delete the report. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSOS = async () => {
    setIsSOSLoading(true);
    setSosSuccess(false);

    let location = null;
    try {
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
    } catch (e) {
      console.log("Geolocation denied or timed out. Using SF fallback for testing.");
      location = { lat: 37.7749, lng: -122.4194 };
    }

    try {
      await api.post("/alerts/sos", { location });
      setSosSuccess(true);
      toast.success("Emergency SOS sent to doctors!");
      setTimeout(() => setSosSuccess(false), 5000);
    } catch (error) {
      console.error("Failed to send SOS", error);
      toast.error("Failed to send SOS alert!");
    } finally {
      setIsSOSLoading(false);
    }
  };

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMood) {
      toast.error("Please select a mood");
      return;
    }
    
    setIsSubmittingMood(true);
    try {
      const res = await api.post("/moods", { mood: newMood, notes: newMoodNotes });
      setMoods([res.data, ...moods]);
      setNewMood("");
      setNewMoodNotes("");
      toast.success("Mood logged successfully!");
    } catch (error) {
      console.error("Failed to log mood", error);
      toast.error("Failed to log mood");
    } finally {
      setIsSubmittingMood(false);
    }
  };

  const handleSelectSlot = (slotInfo: { start: Date, end: Date }) => {
    if (slotInfo.start < new Date()) {
      toast.error("Cannot book appointments in the past");
      return;
    }
    setSelectedDate(slotInfo.start);
    setIsBookingModalOpen(true);
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedDate) {
      toast.error("Please select a doctor and a valid date");
      return;
    }
    setIsBooking(true);
    try {
      const res = await api.post('/appointments', {
        patientId: user?.uid,
        doctorId: selectedDoctorId,
        date: selectedDate.toISOString(),
        notes: appointmentNotes
      });
      setAppointments([...appointments, res.data]);
      setIsBookingModalOpen(false);
      setSelectedDoctorId("");
      setAppointmentNotes("");
      toast.success("Appointment booked successfully!");
    } catch (error) {
      console.error("Failed to book appointment", error);
      toast.error("Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const handleSelectEvent = async (event: any) => {
    if (window.confirm(`Do you want to cancel the appointment: ${event.title}?`)) {
      try {
        await api.delete(`/appointments/${event.id}`);
        setAppointments(appointments.filter(a => a.id !== event.id));
        toast.success("Appointment cancelled successfully");
      } catch (error: any) {
        if (error.response?.status === 404) {
          setAppointments(appointments.filter(a => a.id !== event.id));
          toast.success("Appointment was already cancelled.");
        } else {
          console.error("Failed to cancel appointment", error);
          toast.error("Failed to cancel appointment");
        }
      }
    }
  };

  const handleFetchTrend = async () => {
    setIsFetchingTrend(true);
    try {
      const res = await api.get('/reports/trend');
      setTrendSummary(res.data.trend_summary);
    } catch (error) {
      console.error("Failed to fetch trend", error);
      toast.error("Failed to analyze health trend. Please try again later.");
    } finally {
      setIsFetchingTrend(false);
    }
  };

  const calendarEvents = appointments.map(appt => {
    const doctor = doctorsList.find(d => d.id === appt.doctorId);
    const doctorName = doctor ? `Dr. ${doctor.name}` : 'Doctor';
    return {
      id: appt.id,
      title: `${doctorName} - ${appt.notes || 'Appointment'}`,
      start: new Date(appt.date),
      end: new Date(new Date(appt.date).getTime() + 60 * 60 * 1000), // 1 hour duration
    };
  });

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#030712] transition-colors duration-300">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-cyan-500 rounded-full mb-4 shadow-[0_0_15px_rgba(6,182,212,0.5)]"></div>
          <p className="text-cyan-600 dark:text-cyan-400 font-semibold tracking-wide">Loading Patient Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden transition-colors duration-300">
      <Toaster position="top-center" toastOptions={{ style: { background: 'var(--tw-colors-slate-900)', color: '#fff' } }} />
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30 pointer-events-none mix-blend-multiply dark:mix-blend-screen">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/30 dark:bg-cyan-900/40 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/20 dark:bg-indigo-900/30 blur-[150px]" />
      </div>

      {/* Premium Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#030712]/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto py-4 px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Patient Portal
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
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
      {reportToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-white/10 transform transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-6 border border-red-200 dark:border-red-500/30 mx-auto">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-xl text-center font-bold text-slate-900 dark:text-white mb-2">Delete Report?</h3>
            <p className="text-sm text-center text-slate-600 dark:text-slate-400 mb-8">This action cannot be undone. Are you sure you want to permanently remove this medical report from your history?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setReportToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteReport}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50 flex justify-center items-center"
              >
                {isDeleting ? (
                   <Activity className="animate-spin h-4 w-4 text-white" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fall Detection Alert Modal */}
      {fallDetected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-red-50 dark:bg-red-950 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] dark:shadow-[0_0_50px_rgba(239,68,68,0.4)] border border-red-300 dark:border-red-500 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center mb-6 mx-auto border-4 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] dark:shadow-[0_0_20px_rgba(239,68,68,0.8)]">
              <ShieldAlert className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-red-700 dark:text-white mb-2">Fall Detected!</h3>
            <p className="text-sm text-red-600 dark:text-red-200 mb-8">We detected a potential fall. Contacting emergency services and your doctors in 5 seconds...</p>
            <button 
              onClick={cancelFallAlert}
              className="w-full px-4 py-3 rounded-xl text-base font-bold text-white dark:text-red-950 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg"
            >
              I'm OK (Cancel Alert)
            </button>
          </motion.div>
        </div>
      )}

      <main className="relative z-10 max-w-7xl mx-auto py-8 px-6 lg:px-8 space-y-8">
        
        {/* Voice Assistant Module */}
        <div className="flex justify-center mb-12">
          <VoiceAssistant />
        </div>
        
        {/* Safety Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleSOS}
            disabled={isSOSLoading}
            className={`flex-1 relative overflow-hidden group rounded-3xl shadow-xl dark:shadow-2xl border-2 transition-all duration-300 ${
              sosSuccess 
                ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-500" 
                : "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-600 hover:border-red-400"
            } p-6 sm:p-8 flex items-center justify-center gap-4`}
          >
            {sosSuccess ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/50">
                  <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">SOS Sent</h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-200/70 font-medium">Doctors have been notified.</p>
                </div>
              </>
            ) : (
              <>
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-2xl group-hover:bg-red-500/20 dark:group-hover:bg-red-500/40 transition-all"></div>
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] dark:shadow-[0_0_15px_rgba(239,68,68,0.8)] group-hover:scale-110 transition-transform">
                  {isSOSLoading ? (
                    <Activity className="animate-spin h-6 w-6 text-white" />
                  ) : (
                    <ShieldAlert className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="text-left relative z-10">
                  <h3 className="text-2xl font-black text-red-700 dark:text-white tracking-wide">EMERGENCY SOS</h3>
                  <p className="text-red-600 dark:text-red-300/80 text-sm font-medium">Tap to instantly alert medical staff</p>
                </div>
              </>
            )}
          </button>
        </div>
        
        {/* Report AI Demystifier Bar */}
        <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 relative overflow-hidden group transition-colors duration-300">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 blur-3xl transition-opacity duration-500 opacity-50 group-hover:opacity-100"></div>
          
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 relative z-10 flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            AI Report Demystifier
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 relative z-10">Upload a photo of your paper medical report or paste the text below. Our AI will translate it into plain, easy-to-understand language.</p>
          
          <form onSubmit={handleCreateReport} className="flex flex-col gap-4 relative z-10">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-1/3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Upload Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReportImage(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                  className="w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 dark:file:bg-indigo-500/10 file:text-indigo-700 dark:file:text-indigo-400 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-500/20 cursor-pointer transition-colors outline-none"
                />
                {imagePreview && (
                  <div className="mt-3 relative inline-block">
                    <img src={imagePreview} alt="preview" className="h-32 object-contain rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black p-1" />
                    <button
                      type="button"
                      onClick={() => { setReportImage(null); setImagePreview(null); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="w-full sm:w-2/3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Or Paste Text</label>
                <textarea
                  value={newReportText}
                  onChange={(e) => setNewReportText(e.target.value)}
                  placeholder="Paste your clinical report here..."
                  className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-base p-5 transition-all duration-300 outline-none min-h-[160px] resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={isSubmitting || (!newReportText.trim() && !reportImage)}
                className="w-full sm:w-auto px-8 py-3 rounded-xl text-sm font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Activity className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    Translating with AI...
                  </span>
                ) : "Demystify Report"}
              </button>
            </div>
            <div className="mt-2">
              <AIDisclaimer />
            </div>
          </form>
        </section>

        {/* Health Trends Over Time */}
        <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 relative overflow-hidden group transition-colors duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center border border-cyan-200 dark:border-cyan-500/30">
              <ActivitySquare className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Health Trends Over Time</h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-2xl">Let our AI analyze your recent medical reports and show you how your health is changing over time. We compare your last 5 reports to identify improvements or worsening conditions.</p>
          
          {!trendSummary && !isFetchingTrend && (
            <button
              onClick={handleFetchTrend}
              className="px-6 py-3 rounded-xl text-sm font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 shadow-sm transition-all flex items-center gap-2 active:scale-95"
            >
              View My Trend
            </button>
          )}

          {isFetchingTrend && (
            <div className="flex items-center gap-3 p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 w-full sm:w-1/2 md:w-1/3">
              <Activity className="animate-spin h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Analyzing your medical history...</span>
            </div>
          )}

          {trendSummary && !isFetchingTrend && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-500/20 rounded-2xl shadow-sm"
            >
              <h3 className="text-sm font-bold text-cyan-700 dark:text-cyan-400 mb-3 flex items-center gap-2">
                <Brain className="w-5 h-5 text-cyan-600 dark:text-cyan-500" />
                AI Trend Summary
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{trendSummary}</p>
              
              <button
                onClick={handleFetchTrend}
                className="mt-5 px-4 py-2 bg-white dark:bg-white/5 rounded-xl text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 shadow-sm transition-all"
              >
                Refresh Trend Analysis
              </button>
            </motion.div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Reports History */}
          <section className="lg:col-span-2 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/30">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Your Medical Reports
              </h2>
            </div>
            <div className="p-6">
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 mb-4 border border-slate-200 dark:border-white/5">
                    <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No reports filed yet. Paste one above!</p>
                </div>
              ) : (
                <ul className="space-y-6">
                  {reports.map((report) => (
                    <li key={report.id} className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors duration-300 relative group">
                      
                      <button 
                        onClick={() => setReportToDelete(report.id)}
                        className="absolute top-4 right-4 p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Report"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      
                      {report.demystifiedText ? (
                        <div className="space-y-3">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 mb-2">
                            <Brain className="w-3 h-3 mr-1.5" />
                            AI Simplified
                          </div>
                          <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {report.demystifiedText}
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
                            <details className="group">
                              <summary 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setExpandedReportId(expandedReportId === report.id ? null : report.id);
                                }}
                                className="text-xs font-semibold text-slate-500 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors list-none flex items-center gap-1"
                              >
                                {expandedReportId === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                View Original Medical Report
                              </summary>
                              {expandedReportId === report.id && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-3 p-4 rounded-xl bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/5 text-xs text-slate-600 dark:text-slate-500 whitespace-pre-wrap font-mono overflow-auto max-h-60"
                                >
                                  {report.originalText}
                                </motion.div>
                              )}
                            </details>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {report.originalText}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="space-y-8">
            {/* Wellness Mood Tracker */}
            <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden transition-colors duration-300">
              <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/30">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smile className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  Wellness Tracker
                </h2>
              </div>
              <div className="p-6">
                <form onSubmit={handleMoodSubmit} className="flex flex-col gap-4">
                  <div className="flex justify-around mb-2">
                    {['Great', 'Okay', 'Bad'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewMood(m)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 ${
                          newMood === m ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'
                        }`}
                      >
                        {m === 'Great' && <Smile className="w-8 h-8" />}
                        {m === 'Okay' && <Meh className="w-8 h-8" />}
                        {m === 'Bad' && <Frown className="w-8 h-8" />}
                        <span className="text-xs font-bold">{m}</span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newMoodNotes}
                    onChange={(e) => setNewMoodNotes(e.target.value)}
                    placeholder="How are you feeling today?"
                    className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 p-3 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none min-h-[80px]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingMood || !newMood}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 focus:outline-none disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    {isSubmittingMood ? "Saving..." : "Log Mood"}
                  </button>
                </form>

                {moods.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 space-y-3">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Logs</h3>
                    <ul className="space-y-3">
                      {moods.slice(0, 3).map((mood, idx) => (
                        <li key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5">
                          <div className={`mt-0.5 ${mood.mood === 'Great' ? 'text-emerald-500 dark:text-emerald-400' : mood.mood === 'Okay' ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'}`}>
                            {mood.mood === 'Great' && <Smile className="w-5 h-5" />}
                            {mood.mood === 'Okay' && <Meh className="w-5 h-5" />}
                            {mood.mood === 'Bad' && <Frown className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-0.5">
                              {mood.createdAt ? new Date(mood.createdAt._seconds * 1000 || Date.now()).toLocaleDateString() : 'Just now'}
                            </p>
                            {mood.notes && <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{mood.notes}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

          {/* Appointments Section */}
          <section className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden transition-colors duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/30">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Appointments Calendar
              </h2>
            </div>
            <div className="p-6">
              <div className="h-[600px] rbc-theme-override transition-colors duration-300">
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%', fontFamily: 'inherit' }}
                  views={['month', 'week', 'day', 'agenda']}
                  tooltipAccessor="title"
                  selectable={true}
                  date={calendarDate}
                  onNavigate={(newDate) => setCalendarDate(newDate)}
                  view={calendarView}
                  onView={(newView) => setCalendarView(newView)}
                  onSelectSlot={handleSelectSlot}
                  onSelectEvent={handleSelectEvent}
                  className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10"
                />
              </div>
            </div>
          </section>
        </div>

        </div>
      </main>

      {/* Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-white/10"
          >
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Book Appointment</h3>
            <p className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-6 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {selectedDate?.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Doctor</label>
                <select 
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-white text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none appearance-none"
                  required
                >
                  <option value="" disabled className="text-slate-500">Choose a doctor</option>
                  {doctorsList.map(doc => (
                    <option key={doc.id} value={doc.id} className="text-slate-900 dark:text-white">Dr. {doc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Reason / Notes</label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  placeholder="E.g., Follow-up on recent report..."
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-950 p-3 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none min-h-[100px]"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBooking || !selectedDoctorId}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  {isBooking ? "Booking..." : "Book Slot"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

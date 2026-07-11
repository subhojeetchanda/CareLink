"use client";

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [currentSources, setCurrentSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/reports/conversations');
      setConversations(res.data);
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.delete(`/reports/conversations/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Failed to delete conversation", error);
      toast.error("Failed to delete conversation");
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const currentTranscript = event.results[0][0].transcript;
          setTranscript(currentTranscript);
          handleVoiceCommand(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          toast.error("Could not recognize speech. Please try again.");
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        console.warn("Speech recognition not supported in this browser.");
      }
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript('');
      setResponse('');
      setCurrentSources([]);
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      toast.error("Your browser does not support voice recognition.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceCommand = async (text: string) => {
    setIsLoading(true);
    
    // Check for SOS
    const lowerText = text.toLowerCase();
    if (lowerText.includes('help') || lowerText.includes('emergency')) {
      try {
        await api.post('/alerts/sos', {});
        const sosMsg = "Emergency SOS alert has been triggered. A doctor has been notified.";
        setResponse(sosMsg);
        speak(sosMsg);
        toast.success("SOS Alert Sent!");
      } catch (error) {
        console.error("SOS failed", error);
        toast.error("Failed to trigger SOS.");
      }
      setIsLoading(false);
      return;
    }

    // Call /api/reports/ask
    try {
      const res = await api.post('/reports/ask', { question: text });
      const answer = res.data.answer;
      const sources = res.data.sources || [];
      
      setCurrentSources(sources);
      
      if (res.data.id) {
        setConversations(prev => [...prev, { id: res.data.id, question: text, answer: answer, sources: sources }]);
      }
      
      speak(answer);
      
      // Clear current interaction states so they don't duplicate the newly added conversation
      setTranscript('');
      setResponse('');
      setCurrentSources([]);
    } catch (error: any) {
      console.error("Failed to fetch answer", error);
      if (error.response?.status === 404) {
        const errorMsg = "I couldn't find any recent reports to answer your question.";
        setResponse(errorMsg);
        speak(errorMsg);
      } else {
        toast.error("Failed to get response.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 mb-4 w-80 sm:w-96 transform transition-all duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Health Buddy
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          <div className="min-h-[120px] max-h-72 overflow-y-auto bg-slate-50 rounded-xl p-4 mb-4 space-y-4">
            {/* Past Conversations */}
            {conversations.map((conv) => (
              <div key={conv.id} className="relative group p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                <button
                  onClick={() => handleDeleteConversation(conv.id)}
                  className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <div className="mb-2 pr-6">
                  <p className="text-xs font-bold text-indigo-500 mb-0.5">You asked:</p>
                  <p className="text-sm text-slate-700 italic">"{conv.question}"</p>
                </div>
                <div className="pt-2 border-t border-slate-50">
                  <p className="text-xs font-bold text-teal-600 mb-0.5">Health Buddy says:</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{conv.answer}</p>
                </div>
                
                {conv.sources && conv.sources.length > 0 ? (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">📚 Sources</p>
                    <div className="flex flex-wrap gap-1">
                      {conv.sources.map((src: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">{src}</span>
                      ))}
                    </div>
                  </div>
                ) : conv.answer ? (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <p className="text-[10px] text-slate-400 italic">Answer based on general knowledge, not a specific source.</p>
                  </div>
                ) : null}
              </div>
            ))}

            {/* Current Interaction */}
            {(transcript || response || isLoading) && (
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl shadow-sm">
                {transcript && (
                  <div className="mb-2">
                    <p className="text-xs font-bold text-indigo-500 mb-0.5">You asked:</p>
                    <p className="text-sm text-slate-700 italic">"{transcript}"</p>
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex items-center gap-2 mt-2 text-teal-600">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold">Thinking...</span>
                  </div>
                )}

                {response && !isLoading && (
                  <div className="pt-2 border-t border-teal-100">
                    <p className="text-xs font-bold text-teal-600 mb-0.5">Health Buddy says:</p>
                    <p className="text-sm text-slate-800 leading-relaxed">{response}</p>
                    
                    {currentSources && currentSources.length > 0 ? (
                      <div className="mt-2 pt-2 border-t border-teal-100/50">
                        <p className="text-[10px] font-bold text-teal-700/60 uppercase tracking-wider mb-1">📚 Sources</p>
                        <div className="flex flex-wrap gap-1">
                          {currentSources.map((src: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 bg-teal-100/50 text-teal-700 rounded text-[10px] font-semibold">{src}</span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-teal-100/50">
                        <p className="text-[10px] text-teal-700/60 italic">Answer based on general knowledge, not a specific source.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {conversations.length === 0 && !transcript && !isLoading && !response && (
              <p className="text-sm text-slate-400 text-center mt-8">
                Tap the microphone and ask a question about your reports, or say "Help" for an emergency.
              </p>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all transform hover:scale-105 ${
                isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-teal-500 text-white hover:bg-teal-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isListening ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10h6v4H9z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
              </svg>
            </button>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-16 h-16 rounded-full bg-teal-500 text-white shadow-xl hover:bg-teal-600 hover:scale-105 transition-all"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      )}
    </div>
  );
}

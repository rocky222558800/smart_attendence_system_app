/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Users, 
  QrCode, 
  Camera, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  LogOut, 
  UserPlus, 
  BarChart, 
  Plus, 
  Play, 
  FileText,
  AlertTriangle,
  ChevronLeft,
  Loader2,
  Upload,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import * as faceapi from 'face-api.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  addDoc, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { Student, Teacher, Session, AttendanceRecord } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button 
      onClick={onLogout}
      className="absolute top-0 right-0 p-3 bg-white rounded-2xl border border-[#1A1A1A]/10 hover:bg-[#F5F5F0] transition-colors group shadow-sm z-10"
      title="Logout"
    >
      <LogOut size={20} className="text-[#1A1A1A]/30 group-hover:text-red-500 transition-colors" />
    </button>
  );
}

// Face API model loading
const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export default function App() {
  const [view, setView] = useState<'home' | 'student-login' | 'teacher-login' | 'student-dash' | 'teacher-dash' | 'teacher-register' | 'student-register'>('home');
  const [previousView, setPreviousView] = useState<'home' | 'student-login' | 'teacher-login' | 'student-dash' | 'teacher-dash' | 'teacher-register' | 'student-register'>('home');

  const navigateTo = (newView: typeof view) => {
    setPreviousView(view);
    setView(newView);
  };
  const [user, setUser] = useState<Student | Teacher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load Face API models
  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setError("Failed to load face recognition models. Please check your internet connection.");
      }
    };
    loadModels();
  }, []);

  // Clear global messages when view changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [view]);

  const [teachersCount, setTeachersCount] = useState<number | null>(null);

  // Check if any teachers exist
  useEffect(() => {
    const checkTeachers = async () => {
      const snap = await getDocs(collection(db, 'teachers'));
      setTeachersCount(snap.size);
    };
    checkTeachers();
  }, []);

  const bootstrapTeacher = async () => {
    setLoading(true);
    try {
      const teacherId = 'T101';
      await setDoc(doc(db, 'teachers', teacherId), {
        teacherId,
        name: 'Admin Teacher',
        email: 'teacher@example.com',
        password: 'password123'
      });
      setTeachersCount(1);
      alert("Teacher account created: teacher@example.com / password123");
    } catch (err) {
      setError("Failed to bootstrap teacher.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('home');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1A1A1A] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-[#1A1A1A]/10 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center text-white">
              <CheckCircle size={20} />
            </div>
            <h1 className="text-xl font-serif italic tracking-tight">Smart Attendance</h1>
          </div>
          {user && (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium hover:text-[#5A5A40] transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center gap-8 py-12"
            >
              <div className="space-y-4">
                <h2 className="text-5xl font-serif italic leading-tight">
                  Seamless Attendance,<br />Verified with Precision.
                </h2>
                <p className="text-[#1A1A1A]/60 max-w-md mx-auto">
                  A modern solution for educational institutions using dynamic QR codes and facial recognition.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
                <button 
                  onClick={() => setView('student-login')}
                  className="group relative p-8 bg-white border border-[#1A1A1A]/10 rounded-3xl hover:border-[#5A5A40] transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40] mb-4 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                    <User size={24} />
                  </div>
                  <h3 className="text-xl font-medium mb-1">Student Login</h3>
                  <p className="text-sm text-[#1A1A1A]/50">Mark your attendance and view details.</p>
                </button>

                <button 
                  onClick={() => setView('teacher-login')}
                  className="group relative p-8 bg-white border border-[#1A1A1A]/10 rounded-3xl hover:border-[#5A5A40] transition-all duration-300 text-left"
                >
                  <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40] mb-4 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
                    <Users size={24} />
                  </div>
                  <h3 className="text-xl font-medium mb-1">Teacher Login</h3>
                  <p className="text-sm text-[#1A1A1A]/50">Manage sessions and view reports.</p>
                </button>
              </div>

              {teachersCount === 0 && (
                <button 
                  onClick={bootstrapTeacher}
                  className="text-xs text-[#5A5A40] font-medium hover:underline"
                >
                  Initialize Teacher Account (Demo)
                </button>
              )}
            </motion.div>
          )}

          {view === 'student-login' && (
            <StudentLogin 
              onLogin={(student) => { setUser(student); navigateTo('student-dash'); }} 
              onBack={() => navigateTo('home')} 
            />
          )}

          {view === 'teacher-login' && (
            <TeacherLogin 
              onLogin={(teacher) => { setUser(teacher); navigateTo('teacher-dash'); }} 
              onBack={() => navigateTo('home')} 
              onRegister={() => navigateTo('teacher-register')}
            />
          )}

          {view === 'teacher-register' && (
            <TeacherRegister 
              onSuccess={() => navigateTo('teacher-login')} 
              onBack={() => navigateTo('teacher-login')} 
              onLogout={handleLogout}
            />
          )}

          {view === 'student-register' && (
            <StudentRegister 
              onSuccess={() => { setSuccess("Student registered successfully!"); navigateTo('teacher-dash'); }} 
              onBack={() => navigateTo(previousView)} 
              onLogout={handleLogout}
            />
          )}

          {view === 'student-dash' && user && 'rollNo' in user && (
            <StudentDashboard 
              student={user} 
              modelsLoaded={modelsLoaded} 
              setView={navigateTo} 
              onLogout={handleLogout}
            />
          )}

          {view === 'teacher-dash' && user && 'teacherId' in user && (
            <TeacherDashboard 
              teacher={user} 
              setView={navigateTo} 
              setSuccess={setSuccess}
              onLogout={handleLogout}
            />
          )}
        </AnimatePresence>
      </main>

      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 shadow-lg z-[100]">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <XCircle size={20} />
          </button>
        </div>
      )}

      {success && (
        <div className="fixed bottom-4 left-4 right-4 bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-3 text-green-700 shadow-lg z-[100]">
          <CheckCircle size={20} />
          <p className="text-sm font-medium">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
            <XCircle size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Components ---

function StudentLogin({ onLogin, onBack }: { onLogin: (s: Student) => void, onBack: () => void }) {
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedRollNo = rollNo.trim().toUpperCase();
    const normalizedPassword = password.trim(); // Don't uppercase password yet, we'll check both
    
    if (!normalizedRollNo || !normalizedPassword) {
      setError("Please enter both Roll Number and Password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'students', normalizedRollNo);
      let docSnap;
      try {
        docSnap = await getDocFromServer(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `students/${normalizedRollNo}`);
      }
      
      if (docSnap && docSnap.exists()) {
        const data = docSnap.data() as Student;
        console.log(`Login attempt for ${normalizedRollNo}: Stored password: "${data.password}", Entered password: "${normalizedPassword}"`);
        
        // Check exact match or case-insensitive match (for roll-number-based password)
        const isMatch = data.password === normalizedPassword || 
                        data.password?.toUpperCase() === normalizedPassword.toUpperCase();

        if (isMatch) {
          onLogin(data);
        } else {
          setError("Invalid password. (Hint: Your default password is your Roll Number)");
        }
      } else {
        setError("Student not found. Please contact your teacher.");
      }
    } catch (err) {
      console.error("Student Login error:", err);
      setError(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 shadow-sm max-w-md mx-auto w-full relative"
    >
      <LogoutButton onLogout={onBack} />
      <h2 className="text-3xl font-serif italic mb-6">Student Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Roll Number</label>
          <input 
            type="text" 
            required
            value={rollNo}
            onChange={(e) => { setRollNo(e.target.value); setError(null); }}
            className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
            placeholder="e.g. 21BCE001"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40] transition-all"
              placeholder="••••••••"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/30 hover:text-[#1A1A1A]/60"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-[#1A1A1A]/40 italic">
            Hint: Your default password is your Roll Number.
          </p>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium hover:bg-[#4A4A30] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Login"}
        </button>
      </form>
      <div className="mt-6 pt-6 border-t border-[#1A1A1A]/5 text-center">
        <button 
          onClick={onBack}
          className="text-sm text-[#5A5A40] font-medium hover:underline"
        >
          Are you a Teacher? Teacher Login
        </button>
      </div>
    </motion.div>
  );
}

function TeacherLogin({ onLogin, onBack, onRegister }: { onLogin: (t: Teacher) => void, onBack: () => void, onRegister: () => void }) {
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedId = teacherId.trim().toUpperCase();
    const normalizedPassword = password.trim();

    if (!normalizedId || !normalizedPassword) {
      setError("Please enter both Teacher ID and Password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, 'teachers', normalizedId);
      let docSnap;
      try {
        docSnap = await getDocFromServer(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `teachers/${normalizedId}`);
      }

      if (docSnap && docSnap.exists()) {
        const data = docSnap.data() as Teacher;
        if (data.password === normalizedPassword) {
          onLogin(data);
        } else {
          setError("Invalid password.");
        }
      } else {
        // Check if this ID exists in the students collection instead
        const studentRef = doc(db, 'students', normalizedId);
        const studentSnap = await getDocFromServer(studentRef);
        
        if (studentSnap.exists()) {
          setError("This ID belongs to a Student. Please use the Student Login screen.");
        } else {
          setError("Teacher ID not found. Please check your ID or register as a new teacher.");
        }
      }
    } catch (err) {
      console.error("Teacher Login error:", err);
      setError(`Login failed: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 shadow-sm max-w-md mx-auto w-full relative"
    >
      <LogoutButton onLogout={onBack} />
      <h2 className="text-3xl font-serif italic mb-6">Teacher Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Teacher ID</label>
          <input 
            type="text" 
            required
            value={teacherId}
            onChange={(e) => { setTeacherId(e.target.value); setError(null); }}
            className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
            placeholder="e.g. T101"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Password</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
              placeholder="••••••••"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/30 hover:text-[#1A1A1A]/60"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium hover:bg-[#4A4A30] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Login"}
        </button>
      </form>
      <div className="mt-8 pt-6 border-t border-[#1A1A1A]/5 text-center">
        <p className="text-sm text-[#1A1A1A]/50 mb-2">Are you a Student?</p>
        <button 
          onClick={onBack}
          className="text-sm text-[#5A5A40] font-medium hover:underline mb-4 block mx-auto"
        >
          Go to Student Login
        </button>
        <div className="h-px bg-[#1A1A1A]/5 w-full my-4" />
        <p className="text-sm text-[#1A1A1A]/50 mb-4">Don't have an account?</p>
        <button 
          onClick={onRegister}
          className="flex items-center gap-2 mx-auto text-[#5A5A40] font-medium hover:underline"
        >
          <UserPlus size={18} /> Register New Teacher
        </button>
      </div>
    </motion.div>
  );
}

function TeacherRegister({ onSuccess, onBack, onLogout }: { onSuccess: () => void, onBack: () => void, onLogout: () => void }) {
  const [formData, setFormData] = useState({ teacherId: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedId = formData.teacherId.trim().toUpperCase();
    const normalizedName = formData.name.trim();
    const normalizedEmail = formData.email.trim();
    const normalizedPassword = formData.password.trim();

    if (!normalizedId || !normalizedName || !normalizedEmail || !normalizedPassword) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Check if ID already exists
      const docRef = doc(db, 'teachers', normalizedId);
      const docSnap = await getDocFromServer(docRef);
      if (docSnap.exists()) {
        setError("Teacher ID already registered.");
        setLoading(false);
        return;
      }

      await setDoc(docRef, {
        teacherId: normalizedId,
        name: normalizedName,
        email: normalizedEmail,
        password: normalizedPassword
      });
      onSuccess();
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 shadow-sm max-w-md mx-auto w-full relative"
    >
      <LogoutButton onLogout={onBack} />
      <h2 className="text-3xl font-serif italic mb-6">Teacher Registration</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Teacher ID</label>
          <input 
            type="text" 
            required
            className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
            value={formData.teacherId}
            onChange={(e) => { setFormData({...formData, teacherId: e.target.value}); setError(null); }}
            placeholder="e.g. T101"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Full Name</label>
          <input 
            type="text" 
            required
            className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
            value={formData.name}
            onChange={(e) => { setFormData({...formData, name: e.target.value}); setError(null); }}
            placeholder="Dr. John Doe"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Email Address</label>
          <input 
            type="email" 
            required
            className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
            value={formData.email}
            onChange={(e) => { setFormData({...formData, email: e.target.value}); setError(null); }}
            placeholder="teacher@university.edu"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Password</label>
          <input 
            type="password" 
            required
            className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
            value={formData.password}
            onChange={(e) => { setFormData({...formData, password: e.target.value}); setError(null); }}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        <button 
          disabled={loading}
          className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium hover:bg-[#4A4A30] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Register"}
        </button>
      </form>
    </motion.div>
  );
}

function StudentRegister({ onSuccess, onBack, onLogout }: { onSuccess: () => void, onBack: () => void, onLogout: () => void }) {
  const [formData, setFormData] = useState({ rollNo: '', name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'photo'>('details');
  const [photo, setPhoto] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (step === 'photo') {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
          setError("Camera access denied.");
        }
      };
      startCamera();
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [step]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(dataUrl);
      
      try {
        setLoading(true);
        const detection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();
        if (detection) {
          setDescriptor(Array.from(detection.descriptor));
          setLoading(false);
        } else {
          setError("No face detected. Try again.");
          setPhoto(null);
          setLoading(false);
        }
      } catch (err) {
        setError("Face detection error.");
        setLoading(false);
      }
    }
  };

  const handleRegister = async () => {
    if (!descriptor || !photo) return;
    setLoading(true);
    try {
      const rollNo = formData.rollNo.trim().toUpperCase();
      const docRef = doc(db, 'students', rollNo);
      const docSnap = await getDocFromServer(docRef);
      if (docSnap.exists()) {
        setError("Roll Number already registered.");
        setLoading(false);
        return;
      }

      // Upload photo
      const response = await fetch(photo);
      const blob = await response.blob();
      const storageRef = ref(storage, `students/${rollNo}.jpg`);
      await uploadBytes(storageRef, blob);
      const photoUrl = await getDownloadURL(storageRef);

      await setDoc(docRef, {
        ...formData,
        rollNo,
        password: formData.password || rollNo,
        photoUrl,
        faceDescriptor: descriptor
      });
      onSuccess();
    } catch (err) {
      setError("Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack} 
          className="p-3 bg-white rounded-2xl border border-[#1A1A1A]/10 hover:bg-[#F5F5F0] transition-colors group"
          title="Back to Dashboard"
        >
          <LogOut size={20} className="text-[#1A1A1A]/30 group-hover:text-red-500 transition-colors rotate-180" />
        </button>
      </div>

      <div className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 shadow-sm space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-serif italic">Register Student</h2>
            <p className="text-[#1A1A1A]/50">Step {step === 'details' ? '1: Student Details' : '2: Face Capture'}</p>
          </div>
          <div className="flex gap-1">
            <div className={cn("w-8 h-1 rounded-full", step === 'details' ? "bg-[#5A5A40]" : "bg-[#5A5A40]/20")} />
            <div className={cn("w-8 h-1 rounded-full", step === 'photo' ? "bg-[#5A5A40]" : "bg-[#5A5A40]/20")} />
          </div>
        </div>

        {step === 'details' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Roll No</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
                  value={formData.rollNo}
                  onChange={(e) => setFormData({...formData, rollNo: e.target.value})}
                  placeholder="24A51..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="student@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Phone</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="1234567890"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1.5">Password (Optional)</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-[#5A5A40]"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Leave blank to use Roll No"
              />
            </div>
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            <button 
              onClick={() => setStep('photo')}
              className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium hover:bg-[#4A4A30] transition-all"
            >
              Next: Capture Photo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {!photo ? (
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-3xl overflow-hidden shadow-inner">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-white/20 rounded-3xl pointer-events-none" />
                </div>
                <button 
                  onClick={capturePhoto}
                  disabled={loading}
                  className="w-full py-4 bg-[#5A5A40] text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <><Camera size={20} /> Capture Face</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="relative aspect-video rounded-3xl overflow-hidden border-4 border-[#5A5A40] shadow-lg">
                  <img src={photo} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[#5A5A40]/10 flex items-center justify-center">
                    <CheckCircle className="text-[#5A5A40]" size={64} />
                  </div>
                </div>
                {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setPhoto(null); setDescriptor(null); setError(null); }}
                    className="flex-1 py-4 border border-[#1A1A1A]/10 rounded-xl font-medium hover:bg-[#F5F5F0] transition-all"
                  >
                    Retake
                  </button>
                  <button 
                    onClick={handleRegister}
                    disabled={loading || !descriptor}
                    className="flex-2 py-4 bg-[#5A5A40] text-white rounded-xl font-medium hover:bg-[#4A4A30] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Complete Registration"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StudentDashboard({ student, modelsLoaded, setView, onLogout }: { student: Student, modelsLoaded: boolean, setView: (v: any) => void, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'scan' | 'details'>('scan');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'verifying-session' | 'verifying-face' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'attendance'), where('studentId', '==', student.rollNo));
    const unsubscribe = onSnapshot(q, (snap) => {
      const records = snap.docs.map(doc => doc.data() as AttendanceRecord);
      setAttendanceRecords(records);
    });
    return () => unsubscribe();
  }, [student.rollNo]);

  // Camera Management
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const constraints = status === 'scanning' 
          ? { video: { facingMode: 'environment' } } 
          : { video: true };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          if (status === 'scanning') {
            requestAnimationFrame(scanQRCode);
          }
        }
      } catch (err) {
        console.error("Camera error:", err);
        setStatus('error');
        setResultMessage("Camera access denied or error occurred.");
      }
    };

    if (status === 'scanning' || status === 'verifying-face') {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [status]);

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || status !== 'scanning') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code) {
        handleQRDetected(code.data);
        return;
      }
    }
    requestAnimationFrame(scanQRCode);
  };

  const handleQRDetected = async (data: string) => {
    setStatus('verifying-session');
    
    try {
      if (!data || data.length < 5) throw new Error("Invalid QR code data.");

      let sessionId = data;
      try {
        const parsed = JSON.parse(data);
        if (parsed.sessionId) {
          sessionId = parsed.sessionId;
        }
      } catch (e) {
        // Not JSON, assume it's just the sessionId
      }

      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDocFromServer(sessionRef);
      
      if (sessionSnap.exists()) {
        const session = sessionSnap.data() as Session;
        if (!session.active) {
          setStatus('error');
          setResultMessage("This session is no longer active.");
          return;
        }
        setCurrentSession(session);
        verifyLocation(session);
      } else {
        setStatus('error');
        setResultMessage("Invalid QR code. Session not found.");
      }
    } catch (err) {
      console.error("QR Error:", err);
      setStatus('error');
      setResultMessage("Error verifying session. Please try again.");
    }
  };

  const verifyLocation = (session: Session) => {
    if (!navigator.geolocation) {
      setStatus('error');
      setResultMessage("Geolocation not supported on this device.");
      return;
    }

    const timeoutId = setTimeout(() => {
      setStatus('error');
      setResultMessage("Location verification timed out. Please ensure GPS is enabled and try again.");
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = pos.coords;
        const dist = getDistance(latitude, longitude, session.location.lat, session.location.lng);
        
        if (dist <= session.location.radius) {
          if (!modelsLoaded) {
            setStatus('error');
            setResultMessage("Face recognition models are still loading. Please wait a moment.");
            return;
          }
          setStatus('verifying-face');
        } else {
          setStatus('error');
          setResultMessage(`You are outside the permitted area (${Math.round(dist)}m away).`);
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        let msg = "Could not verify location.";
        if (error.code === error.PERMISSION_DENIED) msg = "Location permission denied. Please enable location services.";
        setStatus('error');
        setResultMessage(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const verifyFace = async () => {
    if (!videoRef.current || !student.faceDescriptor || !currentSession) return;
    
    try {
      const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
      if (detection) {
        const distance = faceapi.euclideanDistance(detection.descriptor, new Float32Array(student.faceDescriptor));
        if (distance < 0.6) {
          await markAttendance();
        } else {
          setStatus('error');
          setResultMessage("Face match failed. Please ensure your face is clearly visible.");
        }
      } else {
        setStatus('error');
        setResultMessage("No face detected. Please look directly at the camera.");
      }
    } catch (err) {
      console.error("Face Error:", err);
      setStatus('error');
      setResultMessage("Face verification error. Please try again.");
    }
  };

  const markAttendance = async () => {
    if (!currentSession) return;
    try {
      const attendanceId = `${student.rollNo}_${currentSession.sessionId}`;
      await setDoc(doc(db, 'attendance', attendanceId), {
        attendanceId,
        studentId: student.rollNo,
        sessionId: currentSession.sessionId,
        timestamp: new Date().toISOString(),
        location: { lat: 0, lng: 0 },
        status: 'present'
      });
      setStatus('success');
      setResultMessage("Attendance marked successfully!");
    } catch (err) {
      console.error("Attendance Error:", err);
      setStatus('error');
      setResultMessage("Failed to mark attendance in database.");
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const attendancePercentage = attendanceRecords.length > 0 ? (attendanceRecords.length / 10) * 100 : 0; // Mock 10 total sessions

  return (
    <div className="space-y-8 relative">
      <LogoutButton onLogout={onLogout} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-[#5A5A40]/10 border border-[#5A5A40]/20 flex items-center justify-center overflow-hidden">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={32} className="text-[#5A5A40]" />
            )}
          </div>
          <div>
            <h2 className="text-3xl font-serif italic">Welcome, {student.name}</h2>
            <p className="text-[#1A1A1A]/50 font-mono text-sm">Roll No: {student.rollNo}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-white border border-[#1A1A1A]/10 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('scan')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === 'scan' ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
          )}
        >
          Scan QR
        </button>
        <button 
          onClick={() => setActiveTab('details')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-medium transition-all",
            activeTab === 'details' ? "bg-[#5A5A40] text-white shadow-sm" : "text-[#1A1A1A]/50 hover:text-[#1A1A1A]"
          )}
        >
          Attendance Details
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'scan' ? (
          <motion.div 
            key="scan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 text-center space-y-6"
          >
            {status === 'idle' && (
              <div className="py-12 flex flex-col items-center gap-6">
                <div className="w-24 h-24 bg-[#5A5A40]/10 rounded-[32px] flex items-center justify-center text-[#5A5A40]">
                  <QrCode size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif italic">Ready to scan?</h3>
                  <p className="text-[#1A1A1A]/50 max-w-xs">Scan the QR code displayed by your teacher to mark attendance.</p>
                </div>
                <button 
                  onClick={() => setStatus('scanning')}
                  className="px-8 py-4 bg-[#5A5A40] text-white rounded-2xl font-medium hover:bg-[#4A4A30] transition-all flex items-center gap-2"
                >
                  <Camera size={20} /> Open Scanner
                </button>
              </div>
            )}

            {status === 'verifying-session' && (
              <div className="py-20 flex flex-col items-center gap-6">
                <Loader2 className="animate-spin text-[#5A5A40]" size={48} />
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif italic">Verifying Session...</h3>
                  <p className="text-[#1A1A1A]/50">Checking session status and your location.</p>
                </div>
              </div>
            )}

            {status === 'scanning' && (
              <div className="space-y-4">
                <div className="relative aspect-square max-w-sm mx-auto bg-black rounded-3xl overflow-hidden border-4 border-[#5A5A40]/20">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                    <div className="w-full h-full border-2 border-white/50 rounded-xl" />
                  </div>
                </div>
                <button 
                  onClick={() => setStatus('idle')}
                  className="text-sm font-medium text-red-500"
                >
                  Cancel Scanning
                </button>
              </div>
            )}

            {status === 'verifying-face' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif italic">Face Verification</h3>
                  <p className="text-[#1A1A1A]/50">Look at the camera to verify your identity.</p>
                </div>
                <div className="relative aspect-video max-w-sm mx-auto bg-black rounded-3xl overflow-hidden">
                  <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                </div>
                <button 
                  onClick={verifyFace}
                  className="w-full py-4 bg-[#5A5A40] text-white rounded-2xl font-medium"
                >
                  Verify Face
                </button>
              </div>
            )}

            {(status === 'success' || status === 'error') && (
              <div className="py-12 flex flex-col items-center gap-6">
                <div className={cn(
                  "w-20 h-20 rounded-[28px] flex items-center justify-center",
                  status === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                  {status === 'success' ? <CheckCircle size={40} /> : <XCircle size={40} />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-serif italic">{status === 'success' ? "Success!" : "Failed"}</h3>
                  <p className="text-[#1A1A1A]/50">{resultMessage}</p>
                </div>
                <button 
                  onClick={() => setStatus('idle')}
                  className="text-[#5A5A40] font-medium hover:underline"
                >
                  {status === 'success' ? "Done" : "Try Again"}
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="details"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10">
                <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-2">Attendance %</p>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-serif italic">{attendancePercentage}%</span>
                  {attendancePercentage < 75 && (
                    <span className="text-red-500 flex items-center gap-1 text-xs font-bold mb-2">
                      <AlertTriangle size={14} /> LOW
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-2">Total Present</p>
                <span className="text-5xl font-serif italic">{attendanceRecords.length}</span>
              </div>
              <div className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-2">Last Session</p>
                <span className="text-xl font-serif italic truncate">
                  {attendanceRecords.length > 0 
                    ? new Date(attendanceRecords[0].timestamp).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>

            {attendancePercentage < 75 && (
              <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 flex items-start gap-4">
                <div className="p-2 bg-red-100 rounded-xl text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-red-700">Attendance Warning</h4>
                  <p className="text-sm text-red-600/80">Your attendance is below the required 75%. Please attend more sessions to avoid academic penalties.</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-[32px] border border-[#1A1A1A]/10 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-[#1A1A1A]/5 flex items-center justify-between bg-white">
                <h3 className="font-serif italic text-xl">Attendance History</h3>
                <span className="text-[10px] text-[#1A1A1A]/40 font-bold uppercase tracking-[0.2em]">Total: {attendanceRecords.length}</span>
              </div>
              <div className="divide-y divide-[#1A1A1A]/5">
                {attendanceRecords.length > 0 ? (
                  attendanceRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((rec) => (
                    <div key={rec.attendanceId} className="p-6 flex items-center justify-between hover:bg-[#F5F5F0]/50 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                          <CheckCircle size={24} />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[#1A1A1A]">Session: {rec.sessionId.replace('SESS_', '')}</p>
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-[#1A1A1A]/50 font-bold uppercase tracking-wider">
                              <Calendar size={12} className="opacity-40" />
                              {new Date(rec.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#1A1A1A]/50 font-bold uppercase tracking-wider">
                              <Clock size={12} className="opacity-40" />
                              {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="px-4 py-1.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-[0.1em] shadow-sm">
                          Present
                        </div>
                        <p className="text-[9px] text-[#1A1A1A]/30 font-medium uppercase tracking-widest">Verified</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-[#F5F5F0] rounded-[24px] flex items-center justify-center mx-auto text-[#1A1A1A]/10">
                      <FileText size={40} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[#1A1A1A]/40 font-serif italic text-lg">No records yet</p>
                      <p className="text-[#1A1A1A]/30 text-xs">Your attendance history will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BulkImportModal({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [logs, setLogs] = useState<string[]>([]);

  const handleImport = async () => {
    if (!files) return;
    setProcessing(true);
    setProgress({ current: 0, total: files.length });
    setLogs(["Starting bulk import..."]);

    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rollNo = file.name.split('.')[0].toUpperCase(); // Assuming rollNumber.jpg
      setProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        // Load image
        const img = await faceapi.bufferToImage(file);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        const photoUrl = await fileToBase64(file);
        
        if (detection) {
          await setDoc(doc(db, 'students', rollNo), {
            rollNo,
            name: `Student ${rollNo}`,
            email: `${rollNo.toLowerCase()}@university.edu`,
            phone: '0000000000',
            password: rollNo,
            faceDescriptor: Array.from(detection.descriptor),
            photoUrl
          }, { merge: true });
          setLogs(prev => [...prev, `✅ Processed ${rollNo}`]);
        } else {
          setLogs(prev => [...prev, `❌ No face detected in ${file.name}`]);
        }
      } catch (err) {
        setLogs(prev => [...prev, `❌ Error processing ${file.name}`]);
      }
    }
    setProcessing(false);
    setLogs(prev => [...prev, "Bulk import completed!"]);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-serif italic">Bulk Student Import</h3>
          <button 
            onClick={onClose} 
            className="p-3 bg-white rounded-2xl border border-[#1A1A1A]/10 hover:bg-[#F5F5F0] transition-colors group"
            title="Close"
          >
            <LogOut size={20} className="text-[#1A1A1A]/30 group-hover:text-red-500 transition-colors rotate-180" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-[#1A1A1A]/50">Select multiple student images. Filenames should be the roll numbers (e.g. 24A51A4467.jpg).</p>
          
          <div className="border-2 border-dashed border-[#1A1A1A]/10 rounded-2xl p-8 text-center hover:border-[#5A5A40]/50 transition-colors cursor-pointer relative">
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={(e) => setFiles(e.target.files)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={processing}
            />
            <Upload size={32} className="mx-auto text-[#1A1A1A]/20 mb-2" />
            <p className="text-sm font-medium">{files ? `${files.length} files selected` : "Click or drag to select images"}</p>
          </div>

          {processing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50">
                <span>Processing...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="h-2 bg-[#F5F5F0] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#5A5A40] transition-all duration-300" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="h-32 bg-[#F5F5F0] rounded-xl p-4 overflow-y-auto font-mono text-[10px] space-y-1">
            {logs.map((log, i) => <div key={i}>{log}</div>)}
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-xl text-sm font-medium hover:bg-[#F5F5F0]"
          >
            Cancel
          </button>
          <button 
            onClick={handleImport}
            disabled={!files || processing}
            className="flex-1 py-3 bg-[#5A5A40] text-white rounded-xl text-sm font-medium hover:bg-[#4A4A30] disabled:opacity-50"
          >
            {processing ? "Importing..." : "Start Import"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function TeacherDashboard({ teacher, setView, setSuccess, onLogout }: { teacher: Teacher, setView: (v: any) => void, setSuccess: (m: string | null) => void, onLogout: () => void }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'students'>('sessions');
  const [confirmAction, setConfirmAction] = useState<{ type: 'reset-all' | 'reset-one' | 'delete', id?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('teacherId', '==', teacher.teacherId));
    const unsubscribe = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(doc => doc.data() as Session));
    });

    const studentsUnsubscribe = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs
        .map(doc => doc.data() as Student)
        .filter(s => !s.deleted)
      );
    });

    return () => {
      unsubscribe();
      studentsUnsubscribe();
    }
  }, [teacher.teacherId]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    
    setLoading(true);
    try {
      if (confirmAction.type === 'reset-all') {
        console.log(`Resetting passwords for ${students.length} students...`);
        const batch = writeBatch(db);
        students.forEach(s => {
          const docRef = doc(db, 'students', s.rollNo);
          batch.update(docRef, { password: s.rollNo });
        });
        await batch.commit();
        console.log("Batch commit successful.");
        setSuccess(`Successfully reset passwords for ${students.length} students to their Roll Numbers.`);
      } else if (confirmAction.type === 'reset-one' && confirmAction.id) {
        await updateDoc(doc(db, 'students', confirmAction.id), { password: confirmAction.id });
        setSuccess(`Password for ${confirmAction.id} has been reset.`);
      } else if (confirmAction.type === 'delete' && confirmAction.id) {
        await setDoc(doc(db, 'students', confirmAction.id), { deleted: true }, { merge: true });
        setSuccess(`Student ${confirmAction.id} has been deleted.`);
      }
      setConfirmAction(null);
    } catch (err) {
      console.error("Action error:", err);
      setError("Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetStudentPassword = (rollNo: string) => {
    setConfirmAction({ type: 'reset-one', id: rollNo });
  };

  const resetAllPasswords = () => {
    if (students.length === 0) return;
    setConfirmAction({ type: 'reset-all' });
  };

  const deleteStudent = (rollNo: string) => {
    setConfirmAction({ type: 'delete', id: rollNo });
  };

  const createSession = async () => {
    setLoading(true);
    try {
      const sessionId = `SESS_${Date.now()}`;
      const sessionName = `Session ${sessions.length + 1}`;
      
      // Add session details on QR
      const qrData = JSON.stringify({
        sessionId,
        teacherId: teacher.teacherId,
        teacherName: teacher.name,
        sessionName,
        createdAt: new Date().toISOString()
      });

      const newSession: Session = {
        sessionId,
        teacherId: teacher.teacherId,
        name: sessionName,
        qrCodeData: qrData,
        location: { lat: 0, lng: 0, radius: 100 }, // Default
        active: true,
        createdAt: new Date().toISOString()
      };

      // Get current location for session
      navigator.geolocation.getCurrentPosition(async (pos) => {
        newSession.location.lat = pos.coords.latitude;
        newSession.location.lng = pos.coords.longitude;
        await setDoc(doc(db, 'sessions', sessionId), newSession);
        setActiveSession(newSession);
        setLoading(false);
      }, () => {
        setLoading(false);
        alert("Location access required to start session.");
      });
    } catch (err) {
      setLoading(false);
    }
  };

  const stopSession = async (sessionId: string) => {
    await updateDoc(doc(db, 'sessions', sessionId), { active: false });
    setActiveSession(null);
  };

  const viewAttendance = (session: Session) => {
    setActiveSession(session);
    const q = query(collection(db, 'attendance'), where('sessionId', '==', session.sessionId));
    onSnapshot(q, (snap) => {
      setAttendanceList(snap.docs.map(doc => doc.data() as AttendanceRecord));
    });
  };

  const exportToCSV = () => {
    if (!activeSession) return;
    const headers = ['Roll No', 'Name', 'Status', 'Time'];
    const rows = students.map(student => {
      const record = attendanceList.find(r => r.studentId === student.rollNo);
      return [
        student.rollNo,
        student.name,
        record ? 'Present' : 'Absent',
        record ? new Date(record.timestamp).toLocaleString() : '-'
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${activeSession.sessionId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const presentCount = attendanceList.length;
  const absentCount = students.length - presentCount;

  return (
    <div className="space-y-8 relative">
      <LogoutButton onLogout={onLogout} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif italic">Teacher Panel</h2>
          <p className="text-[#1A1A1A]/50">Logged in as {teacher.name}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setView('student-register')}
            className="px-6 py-3 border border-[#1A1A1A]/10 rounded-2xl font-medium hover:bg-[#F5F5F0] transition-all flex items-center gap-2"
          >
            <UserPlus size={20} /> Add Student
          </button>
          <button 
            onClick={() => setShowBulkImport(true)}
            className="px-6 py-3 border border-[#1A1A1A]/10 rounded-2xl font-medium hover:bg-[#F5F5F0] transition-all flex items-center gap-2"
          >
            <Upload size={20} /> Bulk Import
          </button>
          <button 
            onClick={createSession}
            disabled={loading}
            className="px-6 py-3 bg-[#5A5A40] text-white rounded-2xl font-medium hover:bg-[#4A4A30] transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> New Session</>}
          </button>
        </div>
      </div>

      {showBulkImport && <BulkImportModal onClose={() => setShowBulkImport(false)} />}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl space-y-6 text-center"
          >
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-serif italic mb-2">
                {confirmAction.type === 'reset-all' ? "Reset All Passwords?" : 
                 confirmAction.type === 'reset-one' ? "Reset Password?" : "Delete Student?"}
              </h3>
              <p className="text-sm text-[#1A1A1A]/50">
                {confirmAction.type === 'reset-all' ? `This will reset passwords for ALL ${students.length} students to their Roll Numbers.` :
                 confirmAction.type === 'reset-one' ? `Reset password for ${confirmAction.id} to their Roll Number?` :
                 `Are you sure you want to delete student ${confirmAction.id}? This action cannot be undone.`}
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 border border-[#1A1A1A]/10 rounded-xl text-sm font-medium hover:bg-[#F5F5F0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmAction}
                disabled={loading}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "Confirm"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="flex border-b border-[#1A1A1A]/5 mb-6">
        <button 
          onClick={() => setActiveTab('sessions')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'sessions' ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
          )}
        >
          Sessions
        </button>
        <button 
          onClick={() => setActiveTab('students')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === 'students' ? "border-[#5A5A40] text-[#5A5A40]" : "border-transparent text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
          )}
        >
          Student Management
        </button>
      </div>

      {activeTab === 'sessions' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 px-2">Your Sessions</h3>
          <div className="space-y-2">
            {sessions.map((sess) => (
              <button 
                key={sess.sessionId}
                onClick={() => viewAttendance(sess)}
                className={cn(
                  "w-full p-4 rounded-2xl border text-left transition-all",
                  activeSession?.sessionId === sess.sessionId 
                    ? "bg-white border-[#5A5A40] shadow-sm" 
                    : "bg-white border-[#1A1A1A]/5 hover:border-[#1A1A1A]/20"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{sess.name}</span>
                  {sess.active && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                </div>
                <p className="text-xs text-[#1A1A1A]/50">{new Date(sess.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {activeSession ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[32px] border border-[#1A1A1A]/10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveSession(null)}
                    className="p-3 bg-white rounded-2xl border border-[#1A1A1A]/10 hover:bg-[#F5F5F0] transition-colors group"
                    title="Back to Sessions"
                  >
                    <LogOut size={20} className="text-[#1A1A1A]/30 group-hover:text-red-500 transition-colors rotate-180" />
                  </button>
                  <div>
                    <h3 className="text-2xl font-serif italic">{activeSession.name}</h3>
                    <p className="text-sm text-[#1A1A1A]/50">Session ID: {activeSession.sessionId}</p>
                  </div>
                </div>
                {activeSession.active && (
                  <button 
                    onClick={() => stopSession(activeSession.sessionId)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Stop Session
                  </button>
                )}
              </div>

              {activeSession.active && (
                <div className="flex flex-col items-center gap-6 py-8 bg-[#F5F5F0] rounded-3xl">
                  <div className="text-center space-y-1">
                    <h4 className="text-lg font-serif italic text-[#5A5A40]">{activeSession.name}</h4>
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1A1A]/40">
                      {new Date(activeSession.createdAt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="p-6 bg-white rounded-[40px] shadow-xl border-8 border-white">
                    <QRCodeSVG value={activeSession.qrCodeData} size={240} level="H" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="px-4 py-1.5 bg-[#5A5A40] text-white rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse">
                      Live Session Active
                    </div>
                    <p className="text-[10px] text-[#1A1A1A]/30 font-mono">ID: {activeSession.sessionId}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-[#F5F5F0] rounded-2xl">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1">Present</p>
                  <span className="text-3xl font-serif italic text-green-600">{presentCount}</span>
                </div>
                <div className="p-6 bg-[#F5F5F0] rounded-2xl">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A]/50 mb-1">Absent</p>
                  <span className="text-3xl font-serif italic text-red-600">{absentCount}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Attendance List</h4>
                  <button 
                    onClick={exportToCSV}
                    className="text-sm text-[#5A5A40] font-medium flex items-center gap-1 hover:underline"
                  >
                    <FileText size={16} /> Export CSV
                  </button>
                </div>
                <div className="border border-[#1A1A1A]/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#F5F5F0] text-[#1A1A1A]/50">
                      <tr>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[10px]">Student</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[10px]">Roll No</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[10px]">Status</th>
                        <th className="px-4 py-3 font-medium uppercase tracking-wider text-[10px]">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1A1A1A]/5">
                      {Array.from(new Set(students.map(s => s.rollNo))).map(rollNo => {
                        const student = students.find(s => s.rollNo === rollNo)!;
                        const record = attendanceList.find(r => r.studentId === student.rollNo);
                        return (
                          <tr key={student.rollNo} className="hover:bg-[#F5F5F0]/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#5A5A40]/10 overflow-hidden flex items-center justify-center">
                                  {student.photoUrl ? (
                                    <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <User size={14} className="text-[#5A5A40]" />
                                  )}
                                </div>
                                <span className="font-medium text-xs">{student.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{student.rollNo}</td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                record ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}>
                                {record ? "Present" : "Absent"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#1A1A1A]/50 text-xs">
                              {record ? new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[32px] border border-[#1A1A1A]/10 border-dashed">
              <BarChart size={48} className="text-[#1A1A1A]/20 mb-4" />
              <h3 className="text-xl font-serif italic mb-2">No Session Selected</h3>
              <p className="text-[#1A1A1A]/50 max-w-xs">Select a session from the list or create a new one to start taking attendance.</p>
            </div>
          )}
        </div>
      </div>
    ) : (
      <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] border border-[#1A1A1A]/10 overflow-hidden"
        >
          <div className="p-6 border-b border-[#1A1A1A]/5 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-serif italic">Registered Students</h3>
              <p className="text-xs text-[#1A1A1A]/50">Manage student accounts and passwords.</p>
            </div>
            <button 
              onClick={resetAllPasswords}
              disabled={loading}
              className="px-4 py-2 bg-[#5A5A40]/10 text-[#5A5A40] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#5A5A40] hover:text-white transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Reset All Passwords
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F5F0] text-[#1A1A1A]/50">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Student</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Roll No</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Password</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1A]/5">
                {students.map((student) => (
                  <tr key={student.rollNo} className="hover:bg-[#F5F5F0]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/10 overflow-hidden flex items-center justify-center">
                          {student.photoUrl ? (
                            <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User size={18} className="text-[#5A5A40]" />
                          )}
                        </div>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{student.rollNo}</td>
                    <td className="px-6 py-4">
                      <code className="bg-[#F5F5F0] px-2 py-1 rounded text-xs text-[#5A5A40]">{student.password || student.rollNo}</code>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => resetStudentPassword(student.rollNo)}
                          title="Reset Password"
                          className="p-2 text-[#5A5A40] hover:bg-[#5A5A40]/10 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button 
                          onClick={() => deleteStudent(student.rollNo)}
                          title="Delete Student"
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#1A1A1A]/30 italic">
                      No students registered. Use Bulk Import to add students.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

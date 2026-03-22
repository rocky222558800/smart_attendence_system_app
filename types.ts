export interface Student {
  rollNo: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  faceDescriptor?: number[];
  photoUrl?: string;
  deleted?: boolean;
}

export interface Teacher {
  teacherId: string;
  name: string;
  email: string;
  password?: string;
}

export interface Session {
  sessionId: string;
  teacherId: string;
  name: string;
  qrCodeData: string;
  location: {
    lat: number;
    lng: number;
    radius: number;
  };
  active: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  attendanceId: string;
  studentId: string;
  sessionId: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'present' | 'absent';
}

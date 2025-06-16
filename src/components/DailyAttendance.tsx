import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Calendar, Save, Users, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AttendanceViewer } from './AttendanceViewer';

interface Student {
  id: string;
  name: string;
  class: string;
  created_at: string;
}

interface AttendanceRecord {
  student_id: string;
  status: 'present' | 'absent';
}

interface DailyAttendanceProps {
  onAttendanceChange: () => void;
}

export function DailyAttendance({ onAttendanceChange }: DailyAttendanceProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [existingAttendance, setExistingAttendance] = useState<Record<string, 'present' | 'absent'>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showViewer, setShowViewer] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'present' | 'absent'>('all');

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    loadExistingAttendance();
  }, [selectedDate, students]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('class', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendance = async () => {
    if (students.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('date', selectedDate)
        .in('student_id', students.map(s => s.id));

      if (error) throw error;

      const existingRecords: Record<string, 'present' | 'absent'> = {};
      data?.forEach(record => {
        if (record.student_id) {
          existingRecords[record.student_id] = record.status;
        }
      });

      setExistingAttendance(existingRecords);
      setAttendance(existingRecords);
    } catch (error) {
      console.error('Error loading existing attendance:', error);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      // Prepare attendance records
      const attendanceRecords: AttendanceRecord[] = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        status
      }));

      // Delete existing records for this date
      await supabase
        .from('attendance')
        .delete()
        .eq('date', selectedDate)
        .in('student_id', Object.keys(attendance));

      // Insert new records
      const recordsToInsert = attendanceRecords.map(record => {
        const student = students.find(s => s.id === record.student_id);
        return {
          student_id: record.student_id,
          student_name: student?.name || '',
          student_class: student?.class || '',
          status: record.status,
          recorded_by: userData.user.id,
          date: selectedDate
        };
      });

      const { error } = await supabase
        .from('attendance')
        .insert(recordsToInsert);

      if (error) throw error;

      setExistingAttendance({ ...attendance });
      onAttendanceChange();
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const allPresent: Record<string, 'present' | 'absent'> = {};
    students.forEach(student => {
      allPresent[student.id] = 'present';
    });
    setAttendance(allPresent);
  };

  const markAllAbsent = () => {
    const allAbsent: Record<string, 'present' | 'absent'> = {};
    students.forEach(student => {
      allAbsent[student.id] = 'absent';
    });
    setAttendance(allAbsent);
  };

  const getFilteredStudents = () => {
    if (quickFilter === 'all') return students;
    return students.filter(student => attendance[student.id] === quickFilter);
  };

  const groupedStudents = getFilteredStudents().reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = [];
    }
    acc[student.class].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Sort students alphabetically within each class
  Object.keys(groupedStudents).forEach(className => {
    groupedStudents[className].sort((a, b) => {
      // Sort by creation date (oldest to newest)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  });

  const hasChanges = JSON.stringify(attendance) !== JSON.stringify(existingAttendance);
  const presentCount = Object.values(attendance).filter(status => status === 'present').length;
  const absentCount = Object.values(attendance).filter(status => status === 'absent').length;
  const totalMarked = Object.keys(attendance).length;

  if (showViewer) {
    return <AttendanceViewer onBack={() => setShowViewer(false)} />;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Daily Attendance</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowViewer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
          >
            <Eye className="h-4 w-4" />
            View Records
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No students found. Please add students first in the "Manage Students" section.</p>
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={markAllPresent}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark All Present
            </button>
            <button
              onClick={markAllAbsent}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Mark All Absent
            </button>
            
            {/* Quick Filter */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm font-medium text-gray-700">Show:</span>
              <select
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value as 'all' | 'present' | 'absent')}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Students</option>
                <option value="present">Present Only</option>
                <option value="absent">Absent Only</option>
              </select>
            </div>

            <div className="flex items-center gap-4 ml-auto text-sm text-gray-600">
              <span>Present: <strong className="text-green-600">{presentCount}</strong></span>
              <span>Absent: <strong className="text-red-600">{absentCount}</strong></span>
              <span>Total: <strong className="text-blue-600">{students.length}</strong></span>
            </div>
          </div>

          {/* Attendance List */}
          <div className="space-y-6">
            {Object.entries(groupedStudents).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No students match the current filter.</p>
              </div>
            ) : (
              Object.entries(groupedStudents).map(([className, classStudents]) => (
                <div key={className} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    {className} ({classStudents.length} students)
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {classStudents.map((student) => (
                      <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'present')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              attendance[student.id] === 'present'
                                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-green-50'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Present
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(student.id, 'absent')}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              attendance[student.id] === 'absent'
                                ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-red-50'
                            }`}
                          >
                            <XCircle className="h-4 w-4" />
                            Absent
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Save Button */}
          {totalMarked > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={saveAttendance}
                disabled={saving || !hasChanges}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  hasChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="h-5 w-5" />
                {saving ? 'Saving...' : hasChanges ? 'Save Attendance' : 'No Changes to Save'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
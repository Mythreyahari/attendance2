import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Calendar, Save, Users, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AttendanceViewer } from './AttendanceViewer';

interface Student {
  register_number: string;
  name: string;
  class: string;
  created_at: string;
  roll_number: string;
  department: string;
  shift: number;
  year: string; // Added year field
}

interface AttendanceRecord {
  student_register_number: string;
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
  
  // Added filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  
  // Lists for filter dropdowns
  const [departments, setDepartments] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    loadExistingAttendance();
  }, [selectedDate, students]);
  
  useEffect(() => {
    // Extract unique departments and classes from students
    if (students.length > 0) {
      const uniqueDepartments = [...new Set(students.map(s => s.department))];
      const uniqueClasses = [...new Set(students.map(s => s.class))];
      setDepartments(uniqueDepartments);
      setClasses(uniqueClasses);
    }
  }, [students]);

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
        .select('student_register_number, status')
        .eq('date', selectedDate)
        .in('student_register_number', students.map(s => s.register_number));

      if (error) throw error;

      const existingRecords: Record<string, 'present' | 'absent'> = {};
      data?.forEach(record => {
        if (record.student_register_number) {
          existingRecords[record.student_register_number] = record.status;
        }
      });

      setExistingAttendance(existingRecords);
      setAttendance(existingRecords);
    } catch (error) {
      console.error('Error loading existing attendance:', error);
    }
  };

  const handleAttendanceChange = (studentRegisterNumber: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({
      ...prev,
      [studentRegisterNumber]: status
    }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      const attendanceRecords: AttendanceRecord[] = Object.entries(attendance).map(([studentRegisterNumber, status]) => ({
        student_register_number: studentRegisterNumber,
        status
      }));

      await supabase
        .from('attendance')
        .delete()
        .eq('date', selectedDate)
        .in('student_register_number', Object.keys(attendance));

      const recordsToInsert = attendanceRecords.map(record => {
        const student = students.find(s => s.register_number === record.student_register_number);
        return {
          student_register_number: record.student_register_number,
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
    getFilteredStudents().forEach(student => {
      allPresent[student.register_number] = 'present';
    });
    setAttendance({...attendance, ...allPresent});
  };

  const markAllAbsent = () => {
    const allAbsent: Record<string, 'present' | 'absent'> = {};
    getFilteredStudents().forEach(student => {
      allAbsent[student.register_number] = 'absent';
    });
    setAttendance({...attendance, ...allAbsent});
  };

  const getFilteredStudents = () => {
    // First filter by attendance status
    let filtered = students;
    
    if (quickFilter !== 'all') {
      filtered = filtered.filter(student => attendance[student.register_number] === quickFilter);
    }
    
    // Then apply additional filters
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(student => student.department === departmentFilter);
    }
    
    if (classFilter !== 'all') {
      filtered = filtered.filter(student => student.class === classFilter);
    }
    
    if (shiftFilter !== 'all') {
      filtered = filtered.filter(student => student.shift === parseInt(shiftFilter));
    }
    
    if (yearFilter !== 'all') {
      filtered = filtered.filter(student => student.year === yearFilter);
    }
    
    return filtered;
  };

  const groupedStudents = getFilteredStudents().reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = [];
    }
    acc[student.class].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  Object.keys(groupedStudents).forEach(className => {
    groupedStudents[className].sort((a, b) => {
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Daily Attendance</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowViewer(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span className="hidden xs:inline">View Records</span>
            <span className="xs:hidden">View</span>
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="flex flex-col xs:flex-row flex-wrap gap-3 mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={markAllPresent}
                className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden xs:inline">Mark All Present</span>
                <span className="xs:hidden">All Present</span>
              </button>
              <button
                onClick={markAllAbsent}
                className="flex-1 xs:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <XCircle className="h-4 w-4" />
                <span className="hidden xs:inline">Mark All Absent</span>
                <span className="xs:hidden">All Absent</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2 mt-2 xs:mt-0 xs:ml-4">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Show:</span>
              <select
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value as 'all' | 'present' | 'absent')}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Students</option>
                <option value="present">Present Only</option>
                <option value="absent">Absent Only</option>
              </select>
            </div>
            
            {/* Additional filters */}
            <div className="flex flex-wrap items-center gap-2 mt-2 xs:mt-0">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Shifts</option>
                <option value="1">Shift 1</option>
                <option value="2">Shift 2</option>
              </select>
              
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Years</option>
                <option value="year1">Year 1</option>
                <option value="year2">Year 2</option>
                <option value="year3">Year 3</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-2 xs:mt-0 xs:ml-auto text-xs sm:text-sm text-gray-600">
              <span>Present: <strong className="text-green-600">{presentCount}</strong></span>
              <span>Absent: <strong className="text-red-600">{absentCount}</strong></span>
              <span>Total: <strong className="text-blue-600">{students.length}</strong></span>
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(groupedStudents).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No students match the current filter.</p>
              </div>
            ) : (
              Object.entries(groupedStudents).map(([className, classStudents]) => (
                <div key={className} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                    {className} ({classStudents.length} students)
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {classStudents.map((student) => (
                      <div key={student.register_number} className="flex flex-col xs:flex-row items-start xs:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3 xs:gap-0">
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <div className="flex gap-2 w-full xs:w-auto">
                          <button
                            onClick={() => handleAttendanceChange(student.register_number, 'present')}
                            className={`flex-1 xs:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              attendance[student.register_number] === 'present'
                                ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-green-50'
                            }`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Present
                          </button>
                          <button
                            onClick={() => handleAttendanceChange(student.register_number, 'absent')}
                            className={`flex-1 xs:flex-none flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              attendance[student.register_number] === 'absent'
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

          {totalMarked > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={saveAttendance}
                disabled={saving || !hasChanges}
                className={`flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                  hasChanges
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                {saving ? 'Saving...' : hasChanges ? 'Save Attendance' : 'No Changes to Save'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

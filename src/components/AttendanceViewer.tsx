import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Calendar, Users, CheckCircle, XCircle, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Student {
  register_number: string;
  name: string;
  class: string;
  created_at: string;
  roll_number: string;
  department: string;
  shift: number;
  year: string;
}

interface AttendanceRecord {
  student_register_number: string;
  status: 'present' | 'absent';
  date: string;
}

interface AttendanceViewerProps {
  onBack: () => void;
}

export function AttendanceViewer({ onBack }: AttendanceViewerProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Lists for filter dropdowns
  const [departments, setDepartments] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  const loadStudents = useCallback(async () => {
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
    }
  }, []);

  const loadAttendanceRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_register_number, status, date')
        .eq('date', selectedDate)
        .order('student_register_number', { ascending: true });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadStudents();
    loadAttendanceRecords();
  }, [loadStudents, loadAttendanceRecords]);

  useEffect(() => {
    // Extract unique departments and classes from students
    if (students.length > 0) {
      const uniqueDepartments = [...new Set(students.map(s => s.department))];
      const uniqueClasses = [...new Set(students.map(s => s.class))];
      setDepartments(uniqueDepartments);
      setClasses(uniqueClasses);
    }
  }, [students]);

  const getFilteredRecords = () => {
    let filteredStudents = students;

    // Apply filters
    if (departmentFilter !== 'all') {
      filteredStudents = filteredStudents.filter(student => student.department === departmentFilter);
    }

    if (classFilter !== 'all') {
      filteredStudents = filteredStudents.filter(student => student.class === classFilter);
    }

    if (shiftFilter !== 'all') {
      filteredStudents = filteredStudents.filter(student => student.shift === parseInt(shiftFilter));
    }

    if (yearFilter !== 'all') {
      filteredStudents = filteredStudents.filter(student => student.year === yearFilter);
    }

    // Combine with attendance records
    return filteredStudents.map(student => {
      const record = attendanceRecords.find(r => r.student_register_number === student.register_number);
      return {
        ...student,
        status: record?.status || 'not_marked'
      };
    }).filter(student => {
      if (statusFilter === 'all') return true;
      return student.status === statusFilter;
    });
  };

  const groupedRecords = getFilteredRecords().reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = [];
    }
    acc[student.class].push(student);
    return acc;
  }, {} as Record<string, (Student & { status: string })[]>);

  Object.keys(groupedRecords).forEach(className => {
    groupedRecords[className].sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  });

  const presentCount = getFilteredRecords().filter(r => r.status === 'present').length;
  const absentCount = getFilteredRecords().filter(r => r.status === 'absent').length;
  const notMarkedCount = getFilteredRecords().filter(r => r.status === 'not_marked').length;

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
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">View Attendance Records</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col xs:flex-row flex-wrap gap-3 mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-xs sm:text-sm font-medium text-gray-700">Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
            <option value="not_marked">Not Marked</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-4 ml-auto text-xs sm:text-sm text-gray-600">
          <span>Present: <strong className="text-green-600">{presentCount}</strong></span>
          <span>Absent: <strong className="text-red-600">{absentCount}</strong></span>
          <span>Not Marked: <strong className="text-gray-600">{notMarkedCount}</strong></span>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No students found. Please add students first in the "Manage Students" section.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecords).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No records match the current filters.</p>
            </div>
          ) : (
            Object.entries(groupedRecords).map(([className, classRecords]) => (
              <div key={className} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                  {className} ({classRecords.length} students)
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {classRecords.map((student) => (
                    <div key={student.register_number} className="flex flex-col xs:flex-row items-start xs:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3 xs:gap-0">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <span className="text-sm text-gray-500">Reg: {student.register_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.status === 'present' && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm">
                            <CheckCircle className="h-4 w-4" />
                            Present
                          </div>
                        )}
                        {student.status === 'absent' && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm">
                            <XCircle className="h-4 w-4" />
                            Absent
                          </div>
                        )}
                        {student.status === 'not_marked' && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                            <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                            Not Marked
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

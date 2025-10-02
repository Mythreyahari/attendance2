import React, { useState, useEffect } from 'react';
import { Calendar, Users, CheckCircle, XCircle, Eye, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AttendanceRecord {
  id: string;
  student_register_number: string;
  student_name: string;
  student_class: string;
  status: 'present' | 'absent';
  date: string;
  recorded_at: string;
  student_id: string | null;
}

interface AttendanceViewerProps {
  onBack: () => void;
  onAttendanceChange?: () => void;
}

export function AttendanceViewer({ onBack, onAttendanceChange }: AttendanceViewerProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<{register_number: string; class: string; name: string;}[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  useEffect(() => {
    // Load students once on component mount
    loadStudents();
  }, []);

  useEffect(() => {
    // Load attendance records when students data is available and selectedDate changes
    if (students.length > 0) {
      loadAttendanceRecords();
    }
  }, [students, selectedDate]);

  useEffect(() => {
    applyFilters();
  }, [attendanceRecords, statusFilter, classFilter]);

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('register_number, class, name');

      if (error) {
        console.error('Error loading students:', error);
        return;
      }

      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadAttendanceRecords = async () => {
    setLoading(true);
    try {
      console.log('Loading attendance records for date:', selectedDate);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', selectedDate)
        .order('student_register_number', { ascending: true });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      const records = data || [];

      console.log('Students:', students);
      console.log('Attendance records:', records);

      // Merge attendance records with student class info
      const mergedRecords = records.map(record => {
        const student = students.find(s => s.register_number === record.student_register_number);
        return {
          ...record,
          student_class: student ? student.class : 'Unknown',
          student_name: student ? `${student.name} (${student.register_number})` : (record.student_name || 'Unknown'),
        };
      });

      setAttendanceRecords(mergedRecords);

      // Extract unique classes
      const classes = [...new Set(mergedRecords.map(record => record.student_class))];
      setAvailableClasses(classes);
    } catch (error) {
      console.error('Error loading attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = attendanceRecords;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Filter by class
    if (classFilter !== 'all') {
      filtered = filtered.filter(record => record.student_class === classFilter);
    }

    setFilteredRecords(filtered);
  };

  const handleDelete = async (attendanceId: string) => {
    // Find the student_register_number for the attendance record to delete
    const recordToDelete = attendanceRecords.find(record => record.id === attendanceId);
    if (!recordToDelete) {
      alert('Attendance record not found.');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this student and all their attendance data? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      // Delete all attendance records for the student
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .eq('student_register_number', recordToDelete.student_register_number);

      if (attendanceError) {
        console.error('Error deleting attendance records:', attendanceError);
        alert('Failed to delete attendance records. Please try again.');
        return;
      }

      // Delete the student record
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('register_number', recordToDelete.student_register_number);

      if (studentError) {
        console.error('Error deleting student record:', studentError);
        alert('Failed to delete student record. Please try again.');
        return;
      }

      // Refresh attendance records after deletion
      await loadAttendanceRecords();

      // Notify parent component about attendance change
      if (onAttendanceChange) {
        onAttendanceChange();
      }
    } catch (error) {
      console.error('Error deleting student and attendance records:', error);
      alert('Failed to delete student and attendance records. Please try again.');
    }
  };

  const getStats = () => {
    const present = attendanceRecords.filter(record => record.status === 'present').length;
    const absent = attendanceRecords.filter(record => record.status === 'absent').length;
    const total = attendanceRecords.length;
    return { present, absent, total };
  };

  const groupedRecords = filteredRecords.reduce((acc, record) => {
    // Group by student_class if available, else group by 'Unknown'
    const classKey = record.student_class || 'Unknown';
    if (!acc[classKey]) {
      acc[classKey] = [];
    }
    acc[classKey].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  const stats = getStats();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">View Attendance Records</h2>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Back to Daily Attendance
        </button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'present' | 'absent')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Students</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Class
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classes</option>
            {availableClasses.map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-700">Date</span>
          </div>
          <p className="text-lg font-bold text-blue-600">
            {new Date(selectedDate).toLocaleDateString()}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-700">Present</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.present}</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-700">Absent</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-700">Total</span>
          </div>
          <p className="text-2xl font-bold text-gray-600">{stats.total}</p>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading attendance records...</p>
        </div>
      ) : attendanceRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No attendance records found for {new Date(selectedDate).toLocaleDateString()}</p>
          <p className="text-sm mt-2">Try selecting a different date or mark attendance first.</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No students match the selected filters</p>
          <p className="text-sm mt-2">Try adjusting your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>
              Showing {filteredRecords.length} of {attendanceRecords.length} students
              {statusFilter !== 'all' && ` (${statusFilter} only)`}
              {classFilter !== 'all' && ` from ${classFilter}`}
            </span>
          </div>

          {Object.entries(groupedRecords).map(([className, classRecords]) => (
            <div key={className} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                {className} ({classRecords.length} students)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {classRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`p-3 rounded-lg border-2 ${
                      record.status === 'present'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{record.student_name}</span>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'present'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {record.status === 'present' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </div>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="ml-2 text-red-600 hover:text-red-800 text-xs font-semibold"
                          title="Delete Attendance Record"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Recorded: {new Date(record.recorded_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
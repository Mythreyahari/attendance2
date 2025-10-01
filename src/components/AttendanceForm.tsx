import React, { useState, useEffect } from 'react';
import { School, LogOut, Users, Calendar, CheckCircle, XCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StudentManagement } from './StudentManagement';
import { DailyAttendance } from './DailyAttendance';
import { MonthlyAnalysis } from './MonthlyAnalysis';

interface AttendanceFormProps {
  onLogout: () => void;
  userEmail: string;
}

export function AttendanceForm({ onLogout, userEmail }: AttendanceFormProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'reports'>('attendance');
  const [todaysStats, setTodaysStats] = useState({ present: 0, absent: 0, total: 0 });
  const [studentsCount, setStudentsCount] = useState(0);

  useEffect(() => {
    loadTodaysStats();
    loadStudentsCount();
  }, []);

  const loadTodaysStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('status')
        .eq('date', today);

      if (error) throw error;

      const present = data?.filter(record => record.status === 'present').length || 0;
      const absent = data?.filter(record => record.status === 'absent').length || 0;
      const total = data?.length || 0;

      setTodaysStats({ present, absent, total });
    } catch (error) {
      console.error('Error loading today\'s stats:', error);
    }
  };

  const loadStudentsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setStudentsCount(count || 0);
    } catch (error) {
      console.error('Error loading students count:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleDataChange = () => {
    loadTodaysStats();
    loadStudentsCount();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <School className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Attendance Tracker</h1>
                <p className="text-sm text-gray-500">Welcome, {userEmail}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Mobile Stats Display (visible only on mobile) */}
          <div className="lg:hidden">
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Present</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{todaysStats.present}</span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs font-medium text-red-700">Absent</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{todaysStats.absent}</span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-1">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Students</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{studentsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'attendance'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden xs:inline">Daily Attendance</span>
                <span className="xs:hidden">Attendance</span>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'students'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline">Manage Students</span>
                <span className="xs:hidden">Students</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden xs:inline">Monthly Analysis</span>
                <span className="xs:hidden">Reports</span>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'attendance' ? (
              <DailyAttendance onAttendanceChange={handleDataChange} />
            ) : activeTab === 'students' ? (
              <StudentManagement onStudentsChange={handleDataChange} />
            ) : (
              <MonthlyAnalysis />
            )}
          </div>

          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block space-y-6">
            {/* Today's Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Today's Summary</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700">Present</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{todaysStats.present}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-700">Absent</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{todaysStats.absent}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-700">Marked</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{todaysStats.total}</span>
                </div>
              </div>
            </div>

            {/* Students Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Students</h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{studentsCount}</div>
                <p className="text-sm text-gray-600">Total Students Registered</p>
              </div>
              
              {studentsCount === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    No students registered yet. Click on "Manage Students" to add your first student.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
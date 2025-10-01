import { useState } from 'react';
import { Calendar, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// TypeScript declaration for jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

// autoTable is imported and augments jsPDF automatically; no need to assign it manually.

interface AttendanceReport {
  register_number: string;
  name: string;
  department: string;
  class: string;
  total_working_days: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
}

export function MonthlyAnalysis() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Get the number of days in the selected month
      const daysInMonth = new Date(year, month, 0).getDate();
      
      // Create start and end dates for the month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
      
      // Fetch all students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('class', { ascending: true })
        .order('name', { ascending: true });
      
      if (studentsError) throw studentsError;
      if (!students || students.length === 0) {
        alert('No students found. Please add students first.');
        setLoading(false);
        return;
      }
      
      // Fetch attendance records for the month
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (attendanceError) throw attendanceError;
      
      // Calculate working days (unique dates in attendance records)
      const workingDays = new Set();
      attendanceData?.forEach(record => {
        workingDays.add(record.date);
      });
      const totalWorkingDays = workingDays.size;
      
      // Prepare report data
      const reportData: AttendanceReport[] = students.map(student => {
        // Filter attendance records for this student
        const studentRecords = attendanceData?.filter(record => record.student_register_number === student.register_number) || [];
        const presentCount = studentRecords.filter(record => record.status === 'present').length;
        const absentCount = studentRecords.filter(record => record.status === 'absent').length;
        const attendancePercentage = totalWorkingDays > 0 
          ? Math.round((presentCount / totalWorkingDays) * 100) 
          : 0;
        
        return {
          register_number: student.register_number || 'N/A',
          name: student.name,
          department: student.department || 'N/A',
          class: student.class,
          total_working_days: totalWorkingDays,
          present_count: presentCount,
          absent_count: absentCount,
          attendance_percentage: attendancePercentage
        };
      });
      
      // Generate PDF
      const doc = new jsPDF();
      
      // Add title
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      doc.setFontSize(18);
      doc.text(`Monthly Attendance Report - ${monthNames[month-1]} ${year}`, 14, 22);
      
      // Add report metadata
      doc.setFontSize(10);
      doc.text(`Total Working Days: ${totalWorkingDays}`, 14, 30);
      doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 14, 35);
      
      // Add table
      autoTable(doc, {
        startY: 40,
        head: [[
          'Reg. Number', 
          'Name', 
          'Department', 
          'Class', 
          'Working Days', 
          'Present', 
          'Absent', 
          'Attendance %'
        ]],
        body: reportData.map(record => [
          record.register_number,
          record.name,
          record.department,
          record.class,
          record.total_working_days,
          record.present_count,
          record.absent_count,
          `${record.attendance_percentage}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] }
      });
      
      // Save the PDF
      doc.save(`attendance_report_${monthNames[month-1]}_${year}.pdf`);
      
      alert('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Monthly Attendance Analysis</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select 
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={1}>January</option>
            <option value={2}>February</option>
            <option value={3}>March</option>
            <option value={4}>April</option>
            <option value={5}>May</option>
            <option value={6}>June</option>
            <option value={7}>July</option>
            <option value={8}>August</option>
            <option value={9}>September</option>
            <option value={10}>October</option>
            <option value={11}>November</option>
            <option value={12}>December</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      
      <button
        onClick={generateReport}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
      >
        {loading ? (
          <span>Generating...</span>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Generate and Download Report
          </>
        )}
      </button>
    </div>
  );
}
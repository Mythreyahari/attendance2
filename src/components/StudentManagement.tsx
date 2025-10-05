import React, { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Student {
  // Remove id as it's no longer the primary key
  name: string;
  class: string;
  created_at: string;
  roll_number: string;
  register_number: string; // This is now the primary key
  department: string;
  shift: number;
  year: string; // Added year field
}

interface StudentManagementProps {
  onStudentsChange: () => void;
}

export function StudentManagement({ onStudentsChange }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ 
    name: '', 
    class: '', 
    roll_number: '',
    register_number: '',
    department: '',
    shift: 1,
    year: 'year1' // Default to year1
  });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Add state to track custom input mode
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [isCustomDepartment, setIsCustomDepartment] = useState(false);
  
  // Predefined options for departments and classes
  const predefinedDepartments = React.useMemo(() => ['bsc', 'bca', 'bba', 'ba'], []);
  const predefinedClasses = React.useMemo(() => ['cs', 'chemistry', 'botany', 'zoology', 'tamil', 'english', 'maths'], []);
  
  // State for dropdown options
  const [departments, setDepartments] = useState<string[]>(predefinedDepartments);
  const [classes, setClasses] = useState<string[]>(predefinedClasses);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    // Extract unique departments and classes from students
    if (students.length > 0) {
      const uniqueDepartments = [...new Set(students.map(s => s.department))];
      const uniqueClasses = [...new Set(students.map(s => s.class))];
      
      // Combine predefined options with existing ones from database
      setDepartments([...predefinedDepartments, ...uniqueDepartments.filter(dept => !predefinedDepartments.includes(dept))]);
      setClasses([...predefinedClasses, ...uniqueClasses.filter(cls => !predefinedClasses.includes(cls))]);
    }
  }, [students, predefinedDepartments, predefinedClasses]);

  const loadStudents = async () => {
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
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim() || !newStudent.class.trim() || 
        !newStudent.roll_number.trim() || !newStudent.register_number.trim() || 
        !newStudent.department.trim() || !newStudent.year) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      console.log('Authenticated user data:', userData);
      if (!userData.user) throw new Error('No authenticated user');

      // Check if user exists in users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userData.user.id)
        .single();

      if (userError || !userRecord) {
        alert('Authenticated user record not found in users table. Please contact administrator.');
        throw new Error('Authenticated user record not found in users table');
      }

      console.log('Inserting new student:', newStudent);
      const { data, error } = await supabase
        .from('students')
        .insert({
          name: newStudent.name.trim(),
          class: newStudent.class.trim(),
          roll_number: newStudent.roll_number.trim(),
          register_number: newStudent.register_number.trim(),
          department: newStudent.department.trim(),
          shift: newStudent.shift,
          year: newStudent.year,
          added_by: userData.user.id,
        });

      console.log('Insert response data:', data, 'error:', error);
      if (error) throw error;

      // Update departments and classes if new values
      if (!departments.includes(newStudent.department.trim())) {
        setDepartments([...departments, newStudent.department.trim()]);
      }
      if (!classes.includes(newStudent.class.trim())) {
        setClasses([...classes, newStudent.class.trim()]);
      }

      setNewStudent({ name: '', class: '', roll_number: '', register_number: '', department: '', shift: 1, year: 'year1' });
      setShowAddForm(false);
      loadStudents();
      onStudentsChange();
    } catch (error: unknown) {
      console.error('Error adding student:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to add student. Please try again. Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const updateStudent = async () => {
    if (!editingStudent) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: editingStudent.name.trim(),
          class: editingStudent.class.trim(),
          roll_number: editingStudent.roll_number.trim(),
          // Don't update register_number as it's the primary key
          department: editingStudent.department.trim(),
          shift: editingStudent.shift,
          year: editingStudent.year,
        })
        .eq('register_number', editingStudent.register_number); // Use register_number instead of id

      if (error) throw error;

      setEditingStudent(null);
      loadStudents();
      onStudentsChange();
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Failed to update student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (registerNumber: string) => { // Change parameter type
    if (!confirm('Are you sure you want to delete this student? This will also delete all their attendance records.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('register_number', registerNumber); // Use register_number instead of id

      if (error) throw error;

      loadStudents();
      onStudentsChange();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const groupedStudents = students.reduce((acc, student) => {
    if (!acc[student.class]) {
      acc[student.class] = [];
    }
    acc[student.class].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Sort students by creation date within each class
  Object.keys(groupedStudents).forEach(className => {
    groupedStudents[className].sort((a, b) => {
      // Sort by creation date (oldest to newest)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  });

  // Handle department input change with dropdown update
  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === 'custom') {
      setIsCustomDepartment(true);
      setNewStudent({ ...newStudent, department: '' });
    } else {
      setIsCustomDepartment(false);
      setNewStudent({ ...newStudent, department: value });
      
      // If it's a new department, add it to the dropdown
      if (value && !departments.includes(value)) {
        setDepartments([...departments, value]);
      }
    }
  };

  // Handle class input change with dropdown update
  const handleClassChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === 'custom') {
      setIsCustomClass(true);
      setNewStudent({ ...newStudent, class: '' });
    } else {
      setIsCustomClass(false);
      setNewStudent({ ...newStudent, class: value });
      
      // If it's a new class, add it to the dropdown
      if (value && !classes.includes(value)) {
        setClasses([...classes, value]);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Manage Students</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
          <form onSubmit={addStudent} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number (Primary Key)
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.roll_number}
                  onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter roll number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Register Number
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.register_number}
                  onChange={(e) => setNewStudent({ ...newStudent, register_number: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter register number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter student name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  required
                  value={isCustomClass ? 'custom' : newStudent.class}
                  onChange={(e) => handleClassChange(e)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                  <option value="custom">Add New Class</option>
                </select>
                {isCustomClass && (
                  <input
                    type="text"
                    required
                    value={newStudent.class}
                    className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new class"
                    onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  required
                  value={isCustomDepartment ? 'custom' : newStudent.department}
                  onChange={(e) => handleDepartmentChange(e)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  <option value="custom">Add New Department</option>
                </select>
                {isCustomDepartment && (
                  <input
                    type="text"
                    required
                    value={newStudent.department}
                    className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new department"
                    onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shift
                </label>
                <select
                  required
                  value={newStudent.shift}
                  onChange={(e) => setNewStudent({ ...newStudent, shift: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Shift 1</option>
                  <option value={2}>Shift 2</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  required
                  value={newStudent.year}
                  onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="year1">Year 1</option>
                  <option value="year2">Year 2</option>
                  <option value="year3">Year 3</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Adding...' : 'Add Student'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Display students */}
      {Object.entries(groupedStudents).map(([className, students]) => (
        <div key={className} className="mb-6 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{className}</h3>
          <div className="space-y-4">
            {students.map((student) => (
              <div key={student.register_number} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-gray-600">Reg: {student.register_number} | Dept: {student.department}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingStudent(student)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteStudent(student.register_number)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Student</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <input
                  type="text"
                  value={editingStudent.class}
                  onChange={(e) => setEditingStudent({ ...editingStudent, class: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={editingStudent.department}
                  onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={editingStudent.year}
                  onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="year1">Year 1</option>
                  <option value="year2">Year 2</option>
                  <option value="year3">Year 3</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={updateStudent}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
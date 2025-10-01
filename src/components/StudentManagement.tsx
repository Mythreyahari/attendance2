import React, { useState, useEffect } from 'react';
import { Plus, Users, Edit2, Trash2, Save, X } from 'lucide-react';
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
    shift: 1
  });
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

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
        !newStudent.department.trim()) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('students')
        .insert({
          name: newStudent.name.trim(),
          class: newStudent.class.trim(),
          roll_number: newStudent.roll_number.trim(),
          register_number: newStudent.register_number.trim(),
          department: newStudent.department.trim(),
          shift: newStudent.shift,
          added_by: userData.user.id,
        });

      if (error) throw error;

      setNewStudent({ name: '', class: '', roll_number: '', register_number: '', department: '', shift: 1 });
      setShowAddForm(false);
      loadStudents();
      onStudentsChange();
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to add student. Please try again.');
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
                <input
                  type="text"
                  required
                  value={newStudent.class}
                  onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Grade 5A, Class 10B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.department}
                  onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter department"
                />
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

      {/* The rest of the component remains the same */}
    </div>
  );
}
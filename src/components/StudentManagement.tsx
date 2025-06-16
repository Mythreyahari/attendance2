import React, { useState, useEffect } from 'react';
import { Plus, Users, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Student {
  id: string;
  name: string;
  class: string;
  created_at: string;
}

interface StudentManagementProps {
  onStudentsChange: () => void;
}

export function StudentManagement({ onStudentsChange }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ name: '', class: '' });
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
    if (!newStudent.name.trim() || !newStudent.class.trim()) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('students')
        .insert({
          name: newStudent.name.trim(),
          class: newStudent.class.trim(),
          added_by: userData.user.id,
        });

      if (error) throw error;

      setNewStudent({ name: '', class: '' });
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
        })
        .eq('id', editingStudent.id);

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

  const deleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student? This will also delete all their attendance records.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId);

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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Manage Students</h2>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Student
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <form onSubmit={addStudent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student Name
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Grade 5A, Class 10B"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Adding...' : 'Add Student'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {Object.keys(groupedStudents).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No students added yet. Click "Add Student" to get started.</p>
          </div>
        ) : (
          Object.entries(groupedStudents).map(([className, classStudents]) => (
            <div key={className} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                {className} ({classStudents.length} students)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {classStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    {editingStudent?.id === student.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingStudent.name}
                          onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          value={editingStudent.class}
                          onChange={(e) => setEditingStudent({ ...editingStudent, class: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <button
                          onClick={updateStudent}
                          disabled={loading}
                          className="p-1 text-green-600 hover:text-green-700"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingStudent(null)}
                          className="p-1 text-gray-600 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-gray-900">{student.name}</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingStudent(student)}
                            className="p-1 text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
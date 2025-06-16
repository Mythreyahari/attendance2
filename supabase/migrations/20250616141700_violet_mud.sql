/*
  # Add students table for dynamic attendance

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `name` (text, student name)
      - `class` (text, student class)
      - `added_by` (uuid, teacher who added the student)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `students` table
    - Add policies for teachers to manage their students
  
  3. Changes
    - Students are now managed separately from attendance
    - Attendance records reference student IDs
    - Teachers can add/manage their student roster
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class text NOT NULL,
  added_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their students"
  ON students
  FOR ALL
  TO authenticated
  USING (added_by = auth.uid())
  WITH CHECK (added_by = auth.uid());

-- Add student_id column to attendance table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE attendance ADD COLUMN student_id uuid REFERENCES students(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS students_added_by_idx ON students(added_by);
CREATE INDEX IF NOT EXISTS students_class_idx ON students(class);
CREATE INDEX IF NOT EXISTS attendance_student_id_idx ON attendance(student_id);
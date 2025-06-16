/*
  # Student Attendance Tracker Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - matches Supabase auth.users
      - `email` (text, unique, not null)
      - `full_name` (text)
      - `created_at` (timestamp)
    - `attendance`
      - `id` (uuid, primary key)
      - `student_name` (text, not null)
      - `student_class` (text, not null)
      - `status` (text, not null) - 'present' or 'absent'
      - `recorded_by` (uuid, foreign key to users)
      - `recorded_at` (timestamp)
      - `date` (date) - for easy date-based queries

  2. Security
    - Enable RLS on both tables
    - Users can only see their own profile data
    - Users can only see attendance records they created
    - Users can create attendance records

  3. Indexes
    - Index on attendance.date for efficient date queries
    - Index on attendance.recorded_by for user-specific queries
*/

-- Create users table for storing user profiles
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

-- Create attendance table for storing student attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  student_class text NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent')),
  recorded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recorded_at timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Attendance policies
CREATE POLICY "Users can read own attendance records"
  ON attendance
  FOR SELECT
  TO authenticated
  USING (recorded_by = auth.uid());

CREATE POLICY "Users can create attendance records"
  ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Users can update own attendance records"
  ON attendance
  FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid());

CREATE POLICY "Users can delete own attendance records"
  ON attendance
  FOR DELETE
  TO authenticated
  USING (recorded_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(date);
CREATE INDEX IF NOT EXISTS attendance_recorded_by_idx ON attendance(recorded_by);
CREATE INDEX IF NOT EXISTS attendance_student_class_idx ON attendance(student_class);
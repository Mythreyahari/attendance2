-- Drop existing tables
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================
-- USERS TABLE
-- ==========================
CREATE TABLE users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can manage their own profile
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

CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ==========================
-- STUDENTS TABLE
-- ==========================
CREATE TABLE students (
    register_number VARCHAR(50) PRIMARY KEY,  -- PK
    roll_number VARCHAR(50) UNIQUE,           -- Unique
    name TEXT NOT NULL,
    class TEXT NOT NULL,
    department TEXT,
    shift INTEGER CHECK (shift IN (1,2)),
    year TEXT CHECK (year IN ('year1','year2','year3')), -- Added year field
    added_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own students
CREATE POLICY "Teachers can manage their students"
  ON students
  FOR ALL
  TO authenticated
  USING (added_by = auth.uid())
  WITH CHECK (added_by = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS students_department_idx ON students(department);
CREATE INDEX IF NOT EXISTS students_shift_idx ON students(shift);
CREATE INDEX IF NOT EXISTS students_class_idx ON students(class);
CREATE INDEX IF NOT EXISTS students_year_idx ON students(year); -- Added index for year

-- ==========================
-- ATTENDANCE TABLE
-- ==========================
CREATE TABLE attendance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_register_number VARCHAR(50) NOT NULL REFERENCES students(register_number) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present','absent')),
    recorded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recorded_at timestamptz DEFAULT now(),
    date DATE DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- Indexes
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(date);
CREATE INDEX IF NOT EXISTS attendance_recorded_by_idx ON attendance(recorded_by);
CREATE INDEX IF NOT EXISTS attendance_student_idx ON attendance(student_register_number);
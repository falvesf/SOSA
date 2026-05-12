-- 1. Create Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create Class-Subjects mapping (Many-to-Many)
CREATE TABLE IF NOT EXISTS class_subjects (
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, subject_id)
);

-- 4. Update Teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_type TEXT;

-- 5. Create Teacher-Classes mapping (For Especialista)
CREATE TABLE IF NOT EXISTS teacher_classes (
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, class_id)
);

-- 6. Create Teacher-Subjects mapping (For Regente)
CREATE TABLE IF NOT EXISTS teacher_subjects (
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

-- 7. Update Observations table to use references instead of text
-- We will keep the old columns for backward compatibility if needed, but add the new ones.
ALTER TABLE observations ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);
ALTER TABLE observations ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id);

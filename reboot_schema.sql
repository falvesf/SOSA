-- LIMPEZA DO ESQUEMA ANTERIOR
DROP TABLE IF EXISTS teacher_classes CASCADE;
DROP TABLE IF EXISTS teacher_subjects CASCADE;
DROP TABLE IF EXISTS class_subjects CASCADE;
DROP TABLE IF EXISTS segment_subjects CASCADE;
DROP TABLE IF EXISTS teacher_series CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS series CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;

-- Removemos colunas antigas de observations se existirem
ALTER TABLE observations DROP COLUMN IF EXISTS class_id CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS series_id CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS segment_id CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS subject_id CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS school_unit CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS school_id CASCADE;

---------------------------------------------------------
-- NOVO ESQUEMA (COM ISOLAMENTO POR ESCOLA - MULTI-TENANT)
---------------------------------------------------------

-- Certificando de que a tabela schools existe (já devia existir)
CREATE TABLE IF NOT EXISTS schools (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 1. Segmentos (Turmas maiores, ex: Educação Infantil) -> Isolado por Escola
CREATE TABLE segments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Séries (Salas específicas, ex: Maternal A, 1º Ano A) -> Isolado por Escola (e vinculado a Segmento)
CREATE TABLE series (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Disciplinas -> Isolado por Escola
CREATE TABLE subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Professores -> Isolado por Escola
CREATE TABLE teachers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    teacher_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(school_id, email)
);

-- 5. Vínculo: Disciplinas pertencem a Segmentos
CREATE TABLE segment_subjects (
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (segment_id, subject_id)
);

-- 6. Vínculo de Professores
-- Regentes e Especialistas são vinculados a Séries (Salas)
CREATE TABLE teacher_series (
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, series_id)
);

-- Apenas Especialistas são vinculados a Disciplinas
CREATE TABLE teacher_subjects (
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

-- 7. Atualização da tabela Observations
ALTER TABLE observations ADD COLUMN school_id UUID REFERENCES schools(id);
ALTER TABLE observations ADD COLUMN segment_id UUID REFERENCES segments(id);
ALTER TABLE observations ADD COLUMN series_id UUID REFERENCES series(id);
ALTER TABLE observations ADD COLUMN subject_id UUID REFERENCES subjects(id);

-- ROW LEVEL SECURITY (RLS) - Permissões Básicas para todos Autenticados
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to authenticated on schools" ON schools FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated on segments" ON segments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated on series" ON series FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated on subjects" ON subjects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated on teachers" ON teachers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated on segment_subjects" ON segment_subjects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated on teacher_series" ON teacher_series FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated on teacher_subjects" ON teacher_subjects FOR ALL TO authenticated USING (true);

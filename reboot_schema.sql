-- LIMPEZA DO ESQUEMA ANTERIOR
-- Dropamos as tabelas antigas para evitar conflitos de chaves estrangeiras
DROP TABLE IF EXISTS teacher_classes CASCADE;
DROP TABLE IF EXISTS teacher_subjects CASCADE;
DROP TABLE IF EXISTS class_subjects CASCADE;
DROP TABLE IF EXISTS segment_subjects CASCADE;
DROP TABLE IF EXISTS teacher_series CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS series CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS segments CASCADE;

-- Removemos colunas antigas de observations
ALTER TABLE observations DROP COLUMN IF EXISTS class_id CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS series_id CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS segment_id CASCADE;
ALTER TABLE observations DROP COLUMN IF EXISTS subject_id CASCADE;

---------------------------------------------------------
-- NOVO ESQUEMA (SEGMENTOS -> SÉRIES)
---------------------------------------------------------

-- 1. Segmentos (Turmas maiores, ex: Educação Infantil)
CREATE TABLE segments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Séries (Salas específicas, ex: Maternal A, 1º Ano A)
CREATE TABLE series (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Disciplinas
CREATE TABLE subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Vínculo: Disciplinas pertencem a Segmentos
CREATE TABLE segment_subjects (
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (segment_id, subject_id)
);

-- 5. Vínculo de Professores
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

-- 6. Atualização da tabela Observations
ALTER TABLE observations ADD COLUMN segment_id UUID REFERENCES segments(id);
ALTER TABLE observations ADD COLUMN series_id UUID REFERENCES series(id);
ALTER TABLE observations ADD COLUMN subject_id UUID REFERENCES subjects(id);

-- Supabase Schema for Classroom Observation System (Multi-Tenant)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schools Table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Segments Table
CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Series Table
CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subjects Table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Teachers Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    teacher_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(school_id, email)
);

-- segment_subjects Pivot
CREATE TABLE segment_subjects (
  segment_id UUID REFERENCES segments(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (segment_id, subject_id)
);

-- teacher_series Pivot
CREATE TABLE teacher_series (
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, series_id)
);

-- teacher_subjects Pivot
CREATE TABLE teacher_subjects (
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);

-- Observations Table
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- User who submitted
    school_id UUID REFERENCES schools(id),
    segment_id UUID REFERENCES segments(id),
    series_id UUID REFERENCES series(id),
    subject_id UUID REFERENCES subjects(id),
    teacher_id UUID REFERENCES teachers(id),
    visit_date DATE NOT NULL,
    visit_type TEXT NOT NULL, -- Formativa, Acompanhamento, Devolutiva, Outro
    visit_type_other TEXT,
    visit_objectives TEXT[], -- Array of objectives
    visit_objectives_other TEXT,

    -- PLANEJAMENTO E ALINHAMENTO CURRICULAR
    planning_evaluation TEXT, -- Atende plenamente, Atende parcialmente, Não atende, Não observado
    plan_alignment_score INTEGER,
    plan_content_score INTEGER,
    plan_objectives_score INTEGER,
    plan_references_score INTEGER,
    planning_observations TEXT,

    -- METODOLOGIA E ESTRATÉGIAS DE ENSINO
    methodology_evaluation TEXT,
    meth_adequate_score INTEGER,
    meth_strategies_score INTEGER,
    meth_resources_score INTEGER,
    meth_clarity_score INTEGER,
    methodology_observations TEXT,

    -- AVALIAÇÃO DA APRENDIZAGEM
    learning_evaluation TEXT,
    learn_instruments_score INTEGER,
    learn_formative_score INTEGER,
    learn_feedback_score INTEGER,
    learn_criteria_score INTEGER,
    learning_observations TEXT,

    -- GESTÃO DE SALA DE AULA E CLIMA ESCOLAR
    management_evaluation TEXT,
    man_space_score INTEGER,
    man_respect_score INTEGER,
    man_conflict_score INTEGER,
    man_environment_score INTEGER,
    man_material_score INTEGER,
    man_content_score INTEGER,
    man_activities_score INTEGER,
    man_monitoring_score INTEGER,
    management_observations TEXT,

    -- IDENTIDADE CONFESSIONAL E VALORES ADVENTISTAS
    identity_evaluation TEXT,
    ident_values_score INTEGER,
    ident_posture_score INTEGER,
    ident_language_score INTEGER,
    identity_observations TEXT,

    -- TEXT FIELDS
    strong_points TEXT,
    improvement_opportunities TEXT,
    observation_synthesis TEXT,
    pedagogical_guidelines TEXT,
    forwarding TEXT,

    -- FINAL REGISTRY
    teacher_aware BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE segment_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users" ON schools FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON segments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON series FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON subjects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON teachers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON observations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON segment_subjects FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON teacher_series FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users" ON teacher_subjects FOR ALL TO authenticated USING (true);

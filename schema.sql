-- Supabase Schema for Classroom Observation System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teachers Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Series Table
CREATE TABLE series (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Classes Table
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    series_id UUID REFERENCES series(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Observations Table
CREATE TABLE observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id), -- User who submitted
    school_unit TEXT NOT NULL,
    visit_date DATE NOT NULL,
    teacher_id UUID REFERENCES teachers(id),
    subject TEXT,
    class_id UUID REFERENCES classes(id),
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
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view, create, update, delete
CREATE POLICY "Allow full access to authenticated users on teachers" ON teachers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users on series" ON series FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users on classes" ON classes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow full access to authenticated users on observations" ON observations FOR ALL TO authenticated USING (true);

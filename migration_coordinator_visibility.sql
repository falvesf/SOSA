-- ============================================================
-- MIGRAÇÃO: Tabela coordinator_visibility
-- Controla quais coordenadores podem ver registros de outros
-- coordenadores na mesma unidade escolar.
-- ============================================================

-- Criar tabela de visibilidade entre coordenadores
CREATE TABLE IF NOT EXISTS coordinator_visibility (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  coordinator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,   -- coordenador que RECEBE acesso extra
  can_see_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- coordenador cujas obs ele poderá ver
  granted_by UUID REFERENCES auth.users(id),                          -- admin que concedeu
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_coord_visibility_unique 
  ON coordinator_visibility(school_id, coordinator_id, can_see_user_id);

-- RLS
ALTER TABLE coordinator_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to authenticated on coordinator_visibility" 
  ON coordinator_visibility FOR ALL TO authenticated USING (true);

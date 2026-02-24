-- Migration: Advanced RAG - Fine-tuning and Multi-modal Support
-- Created: 2026-02-24
-- Purpose: Phase 3D - Enhanced RAG with fine-tuning and multi-modal content
-- Version: v1.0

-- Fine-tuning jobs table
CREATE TABLE IF NOT EXISTS ai_tutor_finetuning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  training_data_url TEXT,
  training_data_size_bytes INTEGER,
  model_version VARCHAR(100), -- e.g., 'gemini-1.5-flash', 'gemini-1.5-pro'
  fine_tuned_model_id VARCHAR(255), -- Returned by fine-tuning service
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_finetuning_jobs_tutor ON ai_tutor_finetuning_jobs(ai_tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_finetuning_jobs_status ON ai_tutor_finetuning_jobs(status, created_at DESC);

COMMENT ON TABLE ai_tutor_finetuning_jobs IS 'Fine-tuning jobs for personalizing AI tutor responses based on teaching style';
COMMENT ON COLUMN ai_tutor_finetuning_jobs.training_data_url IS 'URL to training data file (JSONL format with conversation examples)';
COMMENT ON COLUMN ai_tutor_finetuning_jobs.fine_tuned_model_id IS 'Model ID returned by fine-tuning service for use in inference';

-- Add fine-tuned model reference to ai_tutors
ALTER TABLE ai_tutors ADD COLUMN IF NOT EXISTS fine_tuned_model_id VARCHAR(255);
ALTER TABLE ai_tutors ADD COLUMN IF NOT EXISTS last_finetuned_at TIMESTAMPTZ;

COMMENT ON COLUMN ai_tutors.fine_tuned_model_id IS 'Current active fine-tuned model ID (falls back to base model if null)';
COMMENT ON COLUMN ai_tutors.last_finetuned_at IS 'Timestamp of last successful fine-tuning';

-- Multi-modal content type support
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'text';
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS extracted_text TEXT; -- OCR/transcript text
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS vision_embedding VECTOR(768); -- Image understanding embeddings
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER;
ALTER TABLE ai_tutor_materials ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

-- Add constraint for content_type
ALTER TABLE ai_tutor_materials DROP CONSTRAINT IF EXISTS ai_tutor_materials_content_type_check;
ALTER TABLE ai_tutor_materials ADD CONSTRAINT ai_tutor_materials_content_type_check
  CHECK (content_type IN ('text', 'image', 'pdf', 'video', 'audio', 'document'));

COMMENT ON COLUMN ai_tutor_materials.content_type IS 'Type of content: text, image, pdf, video, audio, document';
COMMENT ON COLUMN ai_tutor_materials.extracted_text IS 'Text extracted from images (OCR), PDFs, or video/audio transcripts';
COMMENT ON COLUMN ai_tutor_materials.vision_embedding IS 'Embedding for image/visual content understanding (768-dim for Gemini)';
COMMENT ON COLUMN ai_tutor_materials.file_size_bytes IS 'File size in bytes for storage tracking';
COMMENT ON COLUMN ai_tutor_materials.mime_type IS 'MIME type of uploaded file (e.g., image/png, application/pdf)';

-- Create HNSW index for vision embeddings (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_vision_embedding
  ON ai_tutor_materials
  USING hnsw (vision_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Function: Hybrid multi-modal search for AI tutor materials
CREATE OR REPLACE FUNCTION search_ai_tutor_materials_multimodal(
  p_ai_tutor_id uuid,
  p_query_text text,
  p_query_embedding vector(768),
  p_query_vision_embedding vector(768) DEFAULT NULL,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  material_id uuid,
  title text,
  content_type varchar(50),
  content text,
  relevance_score numeric,
  match_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as material_id,
    m.title,
    m.content_type,
    COALESCE(m.extracted_text, m.content) as content,
    (
      -- Text embedding similarity (40%)
      (1 - (m.embedding <=> p_query_embedding)) * 0.4 +

      -- Vision embedding similarity (30%, if image/pdf and vision query provided)
      CASE
        WHEN p_query_vision_embedding IS NOT NULL
          AND m.content_type IN ('image', 'pdf')
          AND m.vision_embedding IS NOT NULL
        THEN (1 - (m.vision_embedding <=> p_query_vision_embedding)) * 0.3
        ELSE 0
      END +

      -- Full-text search on extracted text (20%)
      CASE
        WHEN m.extracted_text IS NOT NULL
          AND to_tsvector('english', m.extracted_text) @@ plainto_tsquery('english', p_query_text)
        THEN ts_rank(to_tsvector('english', m.extracted_text), plainto_tsquery('english', p_query_text)) * 0.2
        WHEN m.content IS NOT NULL
          AND to_tsvector('english', m.content) @@ plainto_tsquery('english', p_query_text)
        THEN ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', p_query_text)) * 0.2
        ELSE 0
      END +

      -- Skill tag matching (10%)
      CASE
        WHEN m.skills IS NOT NULL
          AND m.skills::jsonb ? ANY(string_to_array(p_query_text, ' '))
        THEN 0.1
        ELSE 0
      END
    ) as relevance_score,

    -- Determine primary match type for debugging
    CASE
      WHEN (1 - (m.embedding <=> p_query_embedding)) > 0.8 THEN 'text_embedding'
      WHEN p_query_vision_embedding IS NOT NULL
        AND m.vision_embedding IS NOT NULL
        AND (1 - (m.vision_embedding <=> p_query_vision_embedding)) > 0.7 THEN 'vision_embedding'
      WHEN to_tsvector('english', COALESCE(m.extracted_text, m.content)) @@ plainto_tsquery('english', p_query_text) THEN 'full_text'
      ELSE 'skill_match'
    END as match_type

  FROM ai_tutor_materials m
  WHERE m.ai_tutor_id = p_ai_tutor_id
    AND m.status = 'ready'
  ORDER BY relevance_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_ai_tutor_materials_multimodal(UUID, TEXT, VECTOR, VECTOR, INTEGER) IS
  'Enhanced RAG search supporting text, images, PDFs with multi-modal embeddings';

-- Function: Get fine-tuning statistics for AI tutor
CREATE OR REPLACE FUNCTION get_finetuning_stats(p_ai_tutor_id UUID)
RETURNS TABLE (
  total_jobs INTEGER,
  completed_jobs INTEGER,
  failed_jobs INTEGER,
  last_completed_at TIMESTAMPTZ,
  current_model_id VARCHAR(255),
  training_data_size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_jobs,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_jobs,
    COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_jobs,
    MAX(completed_at) FILTER (WHERE status = 'completed') as last_completed_at,
    (SELECT fine_tuned_model_id FROM ai_tutors WHERE id = p_ai_tutor_id) as current_model_id,
    ROUND(COALESCE(SUM(training_data_size_bytes) FILTER (WHERE status = 'completed'), 0) / 1048576.0, 2) as training_data_size_mb
  FROM ai_tutor_finetuning_jobs
  WHERE ai_tutor_id = p_ai_tutor_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_finetuning_stats(UUID) IS 'Get fine-tuning statistics and history for an AI tutor';

-- Function: Get content type statistics
CREATE OR REPLACE FUNCTION get_content_type_stats(p_ai_tutor_id UUID)
RETURNS TABLE (
  content_type VARCHAR(50),
  material_count INTEGER,
  total_size_mb NUMERIC,
  has_vision_embeddings INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.content_type,
    COUNT(*)::INTEGER as material_count,
    ROUND(COALESCE(SUM(m.file_size_bytes), 0) / 1048576.0, 2) as total_size_mb,
    COUNT(*) FILTER (WHERE m.vision_embedding IS NOT NULL)::INTEGER as has_vision_embeddings
  FROM ai_tutor_materials m
  WHERE m.ai_tutor_id = p_ai_tutor_id
    AND m.status = 'ready'
  GROUP BY m.content_type
  ORDER BY material_count DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_content_type_stats(UUID) IS 'Get material content type breakdown and vision embedding coverage';

-- Trigger: Update ai_tutor fine-tuned model when job completes
CREATE OR REPLACE FUNCTION update_ai_tutor_finetuned_model()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE ai_tutors
    SET
      fine_tuned_model_id = NEW.fine_tuned_model_id,
      last_finetuned_at = NOW(),
      updated_at = NOW()
    WHERE id = NEW.ai_tutor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_finetuned_model
  AFTER UPDATE ON ai_tutor_finetuning_jobs
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_ai_tutor_finetuned_model();

COMMENT ON FUNCTION update_ai_tutor_finetuned_model() IS 'Automatically update AI tutor with fine-tuned model ID when job completes';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_content_type ON ai_tutor_materials(ai_tutor_id, content_type);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_materials_extracted_text_fts ON ai_tutor_materials USING gin(to_tsvector('english', extracted_text))
  WHERE extracted_text IS NOT NULL;

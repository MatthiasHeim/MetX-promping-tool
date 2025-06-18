-- Migration: Update GPT-3.5 Turbo to o3 model
-- 20250618064000_update_to_o3_model.sql

-- Update GPT-3.5 Turbo to o3 model with correct pricing
-- o3 pricing: $2.00 per 1M input tokens, $8.00 per 1M output tokens
-- Using input token pricing as the base rate
UPDATE models 
SET 
    id = 'o3',
    name = 'o3',
    price_per_1k_tokens = 0.002000  -- $2.00 per 1M tokens = $0.002 per 1K tokens
WHERE id = 'gpt-3.5-turbo'; 
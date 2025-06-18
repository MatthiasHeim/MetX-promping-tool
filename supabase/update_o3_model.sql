-- Update GPT-3.5 Turbo to o3 model
UPDATE models 
SET 
    id = 'o3',
    name = 'o3',
    price_per_1k_tokens = 0.002
WHERE id = 'gpt-3.5-turbo';

-- Verify the update
SELECT * FROM models ORDER BY name; 
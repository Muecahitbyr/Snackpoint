-- Images created entirely by an AI (e.g. ChatGPT) are labelled on the website
-- as "KI-generiertes Symbolbild" (transparency, Art. 50 EU AI Act). The flag
-- belongs to the image, so the label follows it wherever it is used.
ALTER TABLE media ADD COLUMN ai_generated boolean NOT NULL DEFAULT false;

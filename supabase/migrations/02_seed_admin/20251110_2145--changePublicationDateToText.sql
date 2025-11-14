-- Change publication_date from date to text to support BC/AD format
ALTER TABLE public.texts 
  ALTER COLUMN publication_date TYPE text;


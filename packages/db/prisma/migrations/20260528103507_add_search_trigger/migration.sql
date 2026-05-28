-- CreateIndex
CREATE INDEX "songs_search_idx" ON "songs" USING GIN ("search_vector");

-- Create function to update search_vector from artist and title
CREATE OR REPLACE FUNCTION songs_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('simple', COALESCE(NEW.artist, '')) ||
    to_tsvector('simple', COALESCE(NEW.title, ''));
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger on songs table to auto-populate search_vector
DROP TRIGGER IF EXISTS tsvectorupdate ON "songs";
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON "songs" FOR EACH ROW EXECUTE FUNCTION songs_search_trigger();


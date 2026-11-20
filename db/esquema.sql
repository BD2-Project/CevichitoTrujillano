CREATE TABLE songs (
    song_id INT,
    title TEXT,
    artist TEXT,
    audio_path TEXT,
    duration_seconds FLOAT
);

CREATE INDEX songs_song_id ON songs (song_id) TYPE BTREE;

-- audio_ref termina en #segment=NNNNNN, con el segmento en seis dígitos.
CREATE TABLE audio_segments (
    segment_id INT,
    song_id INT,
    segment_index INT,
    start_seconds FLOAT,
    end_seconds FLOAT,
    audio_ref TEXT
);

CREATE INDEX audio_segments_segment_id ON audio_segments (segment_id) TYPE BTREE;
CREATE INDEX audio_segments_song_id ON audio_segments (song_id) TYPE BTREE;

-- La cabecera se inserta al final y actúa como marca de confirmación.
CREATE TABLE analyses (
    analysis_id TEXT,
    filename TEXT,
    created_at TEXT,
    segment_seconds FLOAT,
    match_count INT
);

CREATE INDEX analyses_analysis_id ON analyses (analysis_id) TYPE BTREE;

-- match_order conserva el orden de presentación por análisis.
CREATE TABLE analysis_matches (
    analysis_id TEXT,
    match_order INT,
    song_id INT,
    query_start FLOAT,
    query_end FLOAT,
    source_start FLOAT,
    source_end FLOAT,
    score FLOAT,
    segment_count INT,
    min_score FLOAT,
    max_score FLOAT,
    alignment_offset_seconds FLOAT,
    is_best_run BOOL
);

CREATE INDEX analysis_matches_analysis_id ON analysis_matches (analysis_id) TYPE BTREE;

-- HNSW se crea después de ingerir el catálogo y entrenar el codebook.
-- CREATE INDEX copyright_audio_hnsw ON audio_segments (audio_ref) USING HNSW WITH METRIC=euclidean, DIMENSION=128, PROFILE='copyright-audio-v1';

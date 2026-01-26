-- Diagnostic script for vehicles table 500 errors
-- Run this to identify the root cause

-- 1. Check table size and row count
SELECT
    pg_size_pretty(pg_total_relation_size('vehicles')) as total_size,
    pg_size_pretty(pg_relation_size('vehicles')) as table_size,
    pg_size_pretty(pg_total_relation_size('vehicles') - pg_relation_size('vehicles')) as indexes_size,
    (SELECT COUNT(*) FROM vehicles) as row_count;

-- 2. Check for NULL or problematic data
SELECT
    COUNT(*) as total_rows,
    COUNT(CASE WHEN id IS NULL THEN 1 END) as null_ids,
    COUNT(CASE WHEN created_at IS NULL THEN 1 END) as null_created_at,
    COUNT(CASE WHEN images IS NULL THEN 1 END) as null_images,
    COUNT(CASE WHEN images = '[]'::jsonb THEN 1 END) as empty_images
FROM vehicles;

-- 3. Check RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'vehicles';

-- 4. Test the problematic query with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM vehicles
ORDER BY id DESC
OFFSET 0
LIMIT 36;

-- 5. Check for slow queries in pg_stat_statements (if enabled)
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%vehicles%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 6. Check current statement timeout
SHOW statement_timeout;

-- 7. Check table statistics
SELECT
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    n_mod_since_analyze as modifications_since_analyze,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'vehicles';

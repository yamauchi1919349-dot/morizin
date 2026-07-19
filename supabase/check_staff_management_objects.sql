-- 森zin 旧スタッフ管理・招待関連オブジェクト確認用（読み取り専用）
-- 上から順に実行できます。各文は参照のみを行います。

-- 1. public schema内のstaff・invitation・invite関連テーブルを確認
SELECT
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    lower(table_name) LIKE '%staff%'
    OR lower(table_name) LIKE '%invitation%'
    OR lower(table_name) LIKE '%invite%'
  )
ORDER BY table_name;

-- 2. public.profilesの全カラムを確認（スタッフ管理との関連は断定しない）
SELECT
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  CASE
    WHEN lower(column_name) IN (
      'role',
      'status',
      'invited_by',
      'invitation_id',
      'facility_id',
      'updated_at',
      'created_at'
    ) THEN true
    ELSE false
  END AS requested_column
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3-1. public.profilesのprimary key・foreign key・unique・check制約を確認
SELECT
  constraint_row.conname AS constraint_name,
  CASE constraint_row.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    ELSE constraint_row.contype::text
  END AS constraint_type,
  pg_get_constraintdef(constraint_row.oid, true) AS definition,
  CASE
    WHEN lower(constraint_row.conname) ~ '(facility|role|invitation|staff)'
      OR lower(pg_get_constraintdef(constraint_row.oid, true)) ~ '(facility_id|role|invitation|staff)'
    THEN true
    ELSE false
  END AS staff_related_name_or_definition
FROM pg_catalog.pg_constraint AS constraint_row
JOIN pg_catalog.pg_class AS table_row
  ON table_row.oid = constraint_row.conrelid
JOIN pg_catalog.pg_namespace AS schema_row
  ON schema_row.oid = table_row.relnamespace
WHERE schema_row.nspname = 'public'
  AND table_row.relname = 'profiles'
  AND constraint_row.contype IN ('p', 'f', 'u', 'c')
ORDER BY constraint_type, constraint_name;

-- 3-2. public.profilesのindexを確認
SELECT
  schemaname AS table_schema,
  tablename AS table_name,
  indexname AS index_name,
  indexdef AS index_definition,
  CASE
    WHEN lower(indexname) ~ '(facility|role|invitation|staff)'
      OR lower(indexdef) ~ '(facility_id|role|invitation|staff)'
    THEN true
    ELSE false
  END AS staff_related_name_or_definition
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY indexname;

-- 4. public schema内で名前または定義にstaff・invite・invitation・facility・profileを含む関数を確認
SELECT
  schema_row.nspname AS function_schema,
  function_row.proname AS function_name,
  pg_get_function_identity_arguments(function_row.oid) AS identity_arguments,
  pg_get_function_result(function_row.oid) AS result_type,
  language_row.lanname AS language_name,
  pg_get_functiondef(function_row.oid) AS function_definition
FROM pg_catalog.pg_proc AS function_row
JOIN pg_catalog.pg_namespace AS schema_row
  ON schema_row.oid = function_row.pronamespace
JOIN pg_catalog.pg_language AS language_row
  ON language_row.oid = function_row.prolang
WHERE schema_row.nspname = 'public'
  AND function_row.prokind = 'f'
  AND (
    lower(function_row.proname) ~ '(staff|invite|invitation|facility|profile)'
    OR lower(pg_get_functiondef(function_row.oid)) ~ '(staff|invite|invitation|facility|profile)'
  )
ORDER BY function_name, identity_arguments;

-- 5. profiles・facilities・staff・invitation・auth.usersに関連するtriggerを確認
SELECT
  table_schema_row.nspname AS table_schema,
  table_row.relname AS table_name,
  trigger_row.tgname AS trigger_name,
  function_schema_row.nspname AS function_schema,
  function_row.proname AS function_name,
  pg_get_triggerdef(trigger_row.oid, true) AS trigger_definition
FROM pg_catalog.pg_trigger AS trigger_row
JOIN pg_catalog.pg_class AS table_row
  ON table_row.oid = trigger_row.tgrelid
JOIN pg_catalog.pg_namespace AS table_schema_row
  ON table_schema_row.oid = table_row.relnamespace
JOIN pg_catalog.pg_proc AS function_row
  ON function_row.oid = trigger_row.tgfoid
JOIN pg_catalog.pg_namespace AS function_schema_row
  ON function_schema_row.oid = function_row.pronamespace
WHERE NOT trigger_row.tgisinternal
  AND (
    (table_schema_row.nspname = 'public' AND lower(table_row.relname) ~ '(profiles|facilities|staff|invite|invitation)')
    OR (table_schema_row.nspname = 'auth' AND table_row.relname = 'users')
    OR lower(trigger_row.tgname) ~ '(profile|facility|staff|invite|invitation)'
    OR lower(function_row.proname) ~ '(profile|facility|staff|invite|invitation)'
  )
ORDER BY table_schema, table_name, trigger_name;

-- 6. profiles・facilities・staff・invitation関連テーブルのRLS policyを確認
SELECT
  schemaname AS table_schema,
  tablename AS table_name,
  policyname AS policy_name,
  permissive,
  roles,
  cmd AS operation,
  qual AS using_condition,
  with_check AS with_check_condition
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND (
    lower(tablename) IN ('profiles', 'facilities')
    OR lower(tablename) LIKE '%staff%'
    OR lower(tablename) LIKE '%invitation%'
    OR lower(tablename) LIKE '%invite%'
  )
ORDER BY table_name, policy_name;

-- 7-1. facilitiesのID・施設名・作成日時・更新日時を確認
-- 任意カラムが存在しない場合も値はNULLとして表示する
SELECT
  to_jsonb(facility_row) ->> 'id' AS facility_id,
  to_jsonb(facility_row) ->> 'name' AS facility_name,
  to_jsonb(facility_row) ->> 'created_at' AS created_at,
  to_jsonb(facility_row) ->> 'updated_at' AS updated_at
FROM public.facilities AS facility_row
ORDER BY facility_id;

-- 7-2. 完全UUIDがローカルで確認できなかったため、指定プレフィックスで施設を確認
SELECT
  to_jsonb(facility_row) ->> 'id' AS facility_id,
  to_jsonb(facility_row) ->> 'name' AS facility_name,
  to_jsonb(facility_row) ->> 'created_at' AS created_at,
  to_jsonb(facility_row) ->> 'updated_at' AS updated_at
FROM public.facilities AS facility_row
WHERE to_jsonb(facility_row) ->> 'id' LIKE '145c1adb-%'
   OR to_jsonb(facility_row) ->> 'id' LIKE '608efbea-%'
ORDER BY facility_id;

-- 8-1. profilesにemail相当列がある場合、対象メールのprofileを確認
-- role・statusなどが存在しない場合も値はNULLとして表示する
SELECT
  to_jsonb(profile_row) ->> 'user_id' AS user_id,
  to_jsonb(profile_row) ->> 'email' AS profile_email,
  to_jsonb(profile_row) ->> 'facility_id' AS facility_id,
  to_jsonb(profile_row) ->> 'role' AS role,
  to_jsonb(profile_row) ->> 'status' AS status,
  to_jsonb(profile_row) ->> 'created_at' AS created_at,
  to_jsonb(profile_row) ->> 'updated_at' AS updated_at
FROM public.profiles AS profile_row
WHERE lower(coalesce(to_jsonb(profile_row) ->> 'email', '')) = 'y.ryosuke_11@icloud.com'
ORDER BY created_at;

-- 8-2. profilesにemailがない場合、auth.usersのemailから安全にprofileを対応付けて確認
SELECT
  auth_user.id AS user_id,
  auth_user.email AS auth_email,
  to_jsonb(profile_row) ->> 'email' AS profile_email,
  to_jsonb(profile_row) ->> 'facility_id' AS facility_id,
  to_jsonb(profile_row) ->> 'role' AS role,
  to_jsonb(profile_row) ->> 'status' AS status,
  to_jsonb(profile_row) ->> 'created_at' AS profile_created_at,
  to_jsonb(profile_row) ->> 'updated_at' AS profile_updated_at,
  auth_user.created_at AS auth_user_created_at,
  auth_user.updated_at AS auth_user_updated_at
FROM auth.users AS auth_user
LEFT JOIN public.profiles AS profile_row
  ON to_jsonb(profile_row) ->> 'user_id' = auth_user.id::text
WHERE lower(auth_user.email) = 'y.ryosuke_11@icloud.com'
ORDER BY auth_user.created_at;

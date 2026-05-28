ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS day_ceilings jsonb
  NOT NULL DEFAULT '{"mon":360,"tue":360,"wed":360,"thu":360,"fri":360,"sat":360,"sun":360}'::jsonb;

UPDATE settings
  SET day_ceilings = jsonb_build_object(
    'mon', daily_ceiling_minutes,
    'tue', daily_ceiling_minutes,
    'wed', daily_ceiling_minutes,
    'thu', daily_ceiling_minutes,
    'fri', daily_ceiling_minutes,
    'sat', daily_ceiling_minutes,
    'sun', daily_ceiling_minutes
  )
  WHERE day_ceilings IS NULL;

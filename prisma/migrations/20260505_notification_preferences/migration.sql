-- Per-(user, type, channel) notification preferences. Absence of a row means
-- "use the default for this type" (typically enabled).

CREATE TYPE "NotificationType" AS ENUM (
  'SESSION_REMINDER',
  'NEW_CLIENT_INVITE_ACCEPTED',
  'CLIENT_COMPLETED_TASKS',
  'NEW_MESSAGE',
  'DAILY_SUMMARY'
);

CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL');

CREATE TABLE "notification_preferences" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL,
  "type"          "NotificationType" NOT NULL,
  "channel"       "NotificationChannel" NOT NULL,
  "enabled"       BOOLEAN NOT NULL DEFAULT TRUE,
  "minutesBefore" INTEGER,
  "dailyAtHour"   INTEGER,
  "customTitle"   TEXT,
  "customBody"    TEXT,

  CONSTRAINT "notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "notification_preferences_userId_type_channel_key"
  ON "notification_preferences"("userId", "type", "channel");
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");

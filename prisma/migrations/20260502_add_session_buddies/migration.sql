-- "Buddy session" — additional client/dog pairs attending a TrainingSession
-- alongside the primary client/dog. Trainer-only visibility.
CREATE TABLE "session_buddies" (
  "id"        TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "clientId"  TEXT NOT NULL,
  "dogId"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "session_buddies_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_buddies_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "client_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "session_buddies_dogId_fkey"
    FOREIGN KEY ("dogId") REFERENCES "dogs"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "session_buddies_sessionId_idx" ON "session_buddies"("sessionId");
CREATE INDEX "session_buddies_clientId_idx" ON "session_buddies"("clientId");
CREATE UNIQUE INDEX "session_buddies_sessionId_clientId_dogId_key"
  ON "session_buddies"("sessionId", "clientId", "dogId");

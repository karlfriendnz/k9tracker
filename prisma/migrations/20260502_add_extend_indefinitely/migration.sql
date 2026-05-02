-- Flag for "forever ongoing" package assignments. When true, the schedule
-- auto-creates more sessions on the package's cadence so the calendar
-- always has ~6 weeks of sessions ahead.
ALTER TABLE "client_packages"
  ADD COLUMN "extendIndefinitely" BOOLEAN NOT NULL DEFAULT false;

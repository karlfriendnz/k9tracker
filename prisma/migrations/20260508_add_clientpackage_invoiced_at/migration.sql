-- Manual invoice flag for ClientPackage assignments. Null = not yet invoiced.
ALTER TABLE "client_packages" ADD COLUMN "invoicedAt" TIMESTAMP(3);

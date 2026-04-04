-- AddColumn billing_rules.email_subject
ALTER TABLE "billing_rules" ADD COLUMN IF NOT EXISTS "email_subject" VARCHAR(255);

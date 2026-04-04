-- AddColumn config_empresa.email_sender_name
ALTER TABLE "config_empresa" ADD COLUMN IF NOT EXISTS "email_sender_name" VARCHAR(200);

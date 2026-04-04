export const env = {
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  PORT: parseInt(process.env['PORT'] ?? '3333'),
  HOST: process.env['HOST'] ?? '0.0.0.0',
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  JWT_SECRET: process.env['JWT_SECRET'] ?? 'kumon-advance-secret-dev',
  CORS_ORIGIN: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
  BCRYPT_ROUNDS: parseInt(process.env['BCRYPT_ROUNDS'] ?? '10'),

  // E-mail (SMTP)
  SMTP_HOST: process.env['SMTP_HOST'] ?? 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env['SMTP_PORT'] ?? '587'),
  SMTP_USER: process.env['SMTP_USER'] ?? '',
  SMTP_PASS: process.env['SMTP_PASS'] ?? '',
  SMTP_FROM: process.env['SMTP_FROM'] ?? 'Kumon Advance <no-reply@kumon-advance.com>',

  // WhatsApp (Evolution API)
  EVOLUTION_API_URL: process.env['EVOLUTION_API_URL'] ?? 'http://localhost:8080',
  EVOLUTION_API_KEY: process.env['EVOLUTION_API_KEY'] ?? '',
  EVOLUTION_INSTANCE: process.env['EVOLUTION_INSTANCE'] ?? 'kumon-advance',

  // E-mail transacional (Brevo)
  BREVO_API_KEY: process.env['BREVO_API_KEY'] ?? '',
  BREVO_SENDER_NAME: process.env['BREVO_SENDER_NAME'] ?? 'Avance Pro',
  BREVO_SENDER_EMAIL: process.env['BREVO_SENDER_EMAIL'] ?? 'no-reply@avanceapp.com.br',
} as const

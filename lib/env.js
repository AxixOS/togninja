const { z } = require('zod');

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_URL: z.string().url().optional(),

  DATABASE_URL: z.string().url().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .or(z.number())
    .transform((v) => Number(v || 587))
    .optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
});

function parseEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors, data: null };
  }
  return { ok: true, data: parsed.data, error: null };
}

const parsed = parseEnv();
const ENV = parsed.ok ? parsed.data : null;

function requireEnv() {
  const re = EnvSchema.refine((o) => !!o.APP_URL && !!o.DATABASE_URL, {
    message: 'APP_URL and DATABASE_URL are required',
  }).safeParse(process.env);
  if (!re.success) {
    const details = re.error.flatten().fieldErrors;
    const err = new Error('Invalid ENV. Check Heroku/Netlify Config Vars.');
    err.details = details;
    throw err;
  }
  // also coerce
  return EnvSchema.parse(process.env);
}

module.exports = { ENV, EnvSchema, parseEnv, requireEnv };

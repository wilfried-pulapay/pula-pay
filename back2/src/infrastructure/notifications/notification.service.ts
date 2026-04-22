import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { config } from '../../shared/config';
import { logger } from '../../shared/utils/logger';

const smsClient = twilio(config.twilio.accountSid, config.twilio.authToken);

const mailer = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export async function sendSmsOtp(phoneNumber: string, code: string): Promise<void> {
  await smsClient.messages.create({
    body: `Votre code de vérification PulaPay : ${code}. Valable 5 minutes.`,
    from: config.twilio.phoneNumber,
    to: phoneNumber,
  });
  logger.info({ phoneNumber }, 'SMS OTP sent');
}

export async function sendEmailOtp(
  email: string,
  otp: string,
  type: 'sign-in' | 'email-verification' | 'forget-password',
): Promise<void> {
  const subjects: Record<typeof type, string> = {
    'email-verification': 'Vérifiez votre adresse email – PulaPay',
    'sign-in': 'Votre code de connexion – PulaPay',
    'forget-password': 'Réinitialisation de mot de passe – PulaPay',
  };

  await mailer.sendMail({
    from: `PulaPay <${config.smtp.from}>`,
    to: email,
    subject: subjects[type],
    text: `Votre code de vérification est : ${otp}\n\nCe code expire dans 5 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#1a1a2e">PulaPay</h2>
        <p>Votre code de vérification :</p>
        <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#2d6cdf;padding:16px 0">
          ${otp}
        </div>
        <p style="color:#666;font-size:14px">Ce code expire dans 5 minutes. Ne le partagez jamais.</p>
      </div>
    `,
  });
  logger.info({ email, type }, 'Email OTP sent');
}

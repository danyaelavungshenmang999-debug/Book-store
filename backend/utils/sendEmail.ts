import { Resend } from 'resend';

export class EmailDeliveryError extends Error {
  status: number;
  code: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_DELIVERY_FAILED';

  constructor(
    message: string,
    status: number,
    code: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_DELIVERY_FAILED'
  ) {
    super(message);
    this.name = 'EmailDeliveryError';
    this.status = status;
    this.code = code;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOtpHtml(name: string, otp: string): string {
  const safeName = escapeHtml(name);
  return `
    <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FAF9F6; color: #18181B; border: 1px solid #E5E0D8;">
      <h1 style="margin: 0 0 8px; font-size: 24px; color: #0F5132;">BookHaven Myanmar</h1>
      <p style="margin: 0 0 24px; font-family: sans-serif; font-size: 14px; color: #52525B;">Email verification required</p>
      <p style="font-family: sans-serif; font-size: 15px; line-height: 1.6;">Mingalaba ${safeName},</p>
      <p style="font-family: sans-serif; font-size: 15px; line-height: 1.6;">
        Use the 6-digit verification code below to verify your email address and activate your BookHaven account.
        This code expires in <strong>5 minutes</strong>.
      </p>
      <div style="margin: 28px 0; padding: 18px; background: #FFFFFF; border: 1px solid #D4D4D8; text-align: center;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0F5132;">${otp}</span>
      </div>
      <p style="font-family: sans-serif; font-size: 12px; color: #71717A;">
        Never share this verification code with anyone. BookHaven staff will never ask for your code.
      </p>
    </div>
  `;
}

export function isEmailServiceConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendOtpEmail(toEmail: string, name: string, otp: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!resendKey) {
    const devMessage =
      'Development configuration error: RESEND_API_KEY is not configured in backend environment variables.';
    const prodMessage =
      'Verification email service is temporarily unavailable. Please try again later.';

    throw new EmailDeliveryError(
      process.env.NODE_ENV !== 'production' ? devMessage : prodMessage,
      503,
      'EMAIL_NOT_CONFIGURED'
    );
  }

  const resend = new Resend(resendKey);
  const fromAddress = process.env.EMAIL_FROM?.trim() || 'BookHaven <onboarding@resend.dev>';
  const html = buildOtpHtml(name, otp);
  const subject = `${otp} is your BookHaven verification code`;

  let result: Awaited<ReturnType<typeof resend.emails.send>>;
  try {
    result = await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject,
      html,
    });
  
  } catch (err) {
    console.error('[BookHaven Mailer] Resend request failed:', err);

    throw new EmailDeliveryError(
      'Unable to reach the Resend email service. Please try again shortly.',
      502,
      'EMAIL_DELIVERY_FAILED'
    );
  }


  if (result.error || !result.data?.id) {
  console.error('[Resend Full Error]:', {
    name: result.error?.name,
    message: result.error?.message,
    statusCode: result.error?.statusCode,
  });

  throw new EmailDeliveryError(
    `Resend failed: ${result.error?.message || 'Unknown error'}`,
    502,
    'EMAIL_DELIVERY_FAILED'
  );
}
}

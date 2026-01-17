// Email sending via Resend

import { Resend } from 'resend';

const FROM_EMAIL = 'Sint Lucas Masters <noreply@sintlucasantwerpen.be>';

export async function sendMagicLink(
	resendApiKey: string,
	email: string,
	token: string,
	baseUrl: string
): Promise<{ success: boolean; error?: string }> {
	const resend = new Resend(resendApiKey);
	const loginUrl = `${baseUrl}/auth/verify?token=${token}`;

	try {
		const { error } = await resend.emails.send({
			from: FROM_EMAIL,
			to: email,
			subject: 'Sign in to Sint Lucas Masters',
			html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="font-size: 24px; margin-bottom: 20px;">Sign in to Sint Lucas Masters</h1>
  <p>Click the button below to sign in to your account. This link will expire in 15 minutes.</p>
  <p style="margin: 30px 0;">
    <a href="${loginUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
      Sign in
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">
    If you didn't request this email, you can safely ignore it.
  </p>
  <p style="color: #666; font-size: 14px;">
    Or copy and paste this URL into your browser:<br>
    <a href="${loginUrl}" style="color: #666;">${loginUrl}</a>
  </p>
</body>
</html>
      `.trim(),
			text: `Sign in to Sint Lucas Masters

Click the link below to sign in to your account. This link will expire in 15 minutes.

${loginUrl}

If you didn't request this email, you can safely ignore it.`,
		});

		if (error) {
			console.error('Resend error:', error);
			return { success: false, error: error.message };
		}

		return { success: true };
	} catch (err) {
		console.error('Email send error:', err);
		return { success: false, error: 'Failed to send email' };
	}
}

// Email sending via AWS SES

import { sendEmail, type SESConfig } from "./aws-ses";

const FROM_EMAIL = "Sint Lucas Masters <info@sintlucasmasters.com>";

/** Escape user-provided strings before interpolating into HTML email templates. */
function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface SendMagicLinkResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  messageId?: string;
}

export async function sendMagicLink(
  sesConfig: SESConfig,
  email: string,
  token: string,
  baseUrl: string,
  configurationSetName?: string
): Promise<SendMagicLinkResult> {
  const loginUrl = `${baseUrl}/auth/verify?token=${token}`;

  const result = await sendEmail(sesConfig, {
    from: FROM_EMAIL,
    to: email,
    subject: "Sign in to Sint Lucas Masters",
    configurationSetName,
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
    <a href="${loginUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; border: 2px solid #fff;">
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

  if (result.success) {
    return {
      success: true,
      messageId: result.messageId,
    };
  }

  return {
    success: false,
    error: result.error,
    errorCode: result.errorCode,
  };
}

export async function sendReviewNotification(
  sesConfig: SESConfig,
  email: string,
  loginUrl: string,
  studentName: string,
  projectTitle: string,
  configurationSetName?: string
): Promise<SendMagicLinkResult> {
  const safeName = escapeHtml(studentName);
  const safeTitle = escapeHtml(projectTitle);

  const result = await sendEmail(sesConfig, {
    from: FROM_EMAIL,
    to: email,
    subject: "Your project is ready for your review",
    configurationSetName,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="font-size: 24px; margin-bottom: 20px;">Your project has been reviewed</h1>
  <p>Hi ${safeName},</p>
  <p>An editor has reviewed the text for your project <strong>${safeTitle}</strong>. Please log in to check the changes and approve your project for print.</p>
  <p>You can still edit the text if needed. Once you're satisfied, click "Approve for Print" to finalize.</p>
  <p style="margin: 30px 0;">
    <a href="${loginUrl}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; border: 2px solid #fff;">
      Review your project
    </a>
  </p>
  <p style="color: #666; font-size: 14px;">
    Or copy and paste this URL into your browser:<br>
    <a href="${loginUrl}" style="color: #666;">${loginUrl}</a>
  </p>
</body>
</html>
    `.trim(),
    text: `Your project has been reviewed

Hi ${studentName},

An editor has reviewed the text for your project "${projectTitle}". Please log in to check the changes and approve your project for print.

You can still edit the text if needed. Once you're satisfied, click "Approve for Print" to finalize.

${loginUrl}`,
  });

  if (result.success) {
    return { success: true, messageId: result.messageId };
  }

  return { success: false, error: result.error, errorCode: result.errorCode };
}

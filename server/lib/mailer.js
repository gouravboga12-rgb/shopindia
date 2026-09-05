const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter based on environment variables.
 */
function createTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  // If custom SMTP host is provided
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: { user, pass },
    });
  }

  // Default to standard Gmail service using App Password
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), // Strip spaces in 16-char app passwords if any
    },
  });
}

/**
 * Sends a password reset OTP email.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - User's name
 * @param {string} options.otp - 6-digit OTP code
 */
async function sendPasswordResetEmail({ to, name, otp }) {
  const transporter = createTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"ShopIndia Support" <${process.env.EMAIL_USER || 'support@shopindia.in'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - ShopIndia</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0F2C59, #0284c7); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 32px 28px; }
        .otp-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
        .otp-code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0369a1; margin: 0; }
        .otp-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
        .notice { font-size: 13px; color: #64748b; line-height: 1.6; }
        .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #991b1b; margin-top: 20px; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ShopIndia</h1>
          <p>Password Reset Verification</p>
        </div>
        <div class="body">
          <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">
            Hello ${name ? name : 'Valued User'},
          </p>
          <p class="notice">
            We received a request to reset the password for your ShopIndia account. Please use the following One-Time Password (OTP) to proceed:
          </p>
          
          <div class="otp-box">
            <div class="otp-label">Your 6-Digit OTP Code</div>
            <div class="otp-code">${otp}</div>
          </div>
          
          <p class="notice" style="text-align: center; font-weight: 600; color: #0284c7;">
            ⏱️ This OTP is valid for <strong>15 minutes</strong>.
          </p>
          
          <div class="warning-box">
            <strong>Security Alert:</strong> Never share this OTP with anyone, including ShopIndia staff. If you did not request a password reset, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ShopIndia Marketplace. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name || 'User'},

We received a request to reset the password for your ShopIndia account.
Your 6-digit OTP code is: ${otp}

This OTP is valid for 15 minutes.
If you did not request this, please ignore this email.

- The ShopIndia Team
  `.trim();

  if (!transporter) {
    console.log('\n========================================');
    console.log('📧 [MAILER DEV MODE - NO SMTP CONFIGURED]');
    console.log(`To: ${to}`);
    console.log(`Name: ${name}`);
    console.log(`🔑 PASSWORD RESET OTP: >>> ${otp} <<<`);
    console.log('========================================\n');
    return {
      sent: false,
      devMode: true,
      otp,
      message: 'Email credentials not set in .env. OTP was logged to server console.',
    };
  }

  const info = await transporter.sendMail({
    from: fromAddress,
    to,
    subject: `ShopIndia - Password Reset OTP: ${otp}`,
    text: textContent,
    html: htmlContent,
  });

  return {
    sent: true,
    messageId: info.messageId,
  };
}

module.exports = {
  createTransporter,
  sendPasswordResetEmail,
};

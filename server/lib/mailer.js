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

  // Default: Gmail App Password (16-char, no spaces)
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user.trim(),
      pass: pass.trim().replace(/\s+/g, ''), // strip any accidental spaces
    },
  });
}

// ─── Shared email header HTML ─────────────────────────────────────────────────
const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
  .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #0F2C59, #0284c7); padding: 32px 24px; text-align: center; color: #ffffff; }
  .header h1 { margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
  .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
  .body { padding: 32px 28px; }
  .otp-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; }
  .otp-code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0369a1; margin: 0; }
  .otp-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .notice { font-size: 13px; color: #64748b; line-height: 1.6; }
  .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #991b1b; margin-top: 20px; }
  .success-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #15803d; margin-top: 20px; }
  .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
`;

// ─── Password Reset OTP Email ─────────────────────────────────────────────────

/**
 * Sends a password reset OTP email.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - User's name
 * @param {string} options.otp - 6-digit OTP code
 */
async function sendPasswordResetEmail({ to, name, otp }) {
  const transporter = createTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"Shop India" <${process.env.EMAIL_USER || 'shopindia36@gmail.com'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset OTP - Shop India</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛍️ Shop India</h1>
          <p>Password Reset Verification</p>
        </div>
        <div class="body">
          <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">
            Hello ${name ? name : 'Valued Customer'},
          </p>
          <p class="notice">
            We received a request to reset the password for your <strong>Shop India</strong> account. Use the OTP below to proceed. Do <strong>not</strong> share this code with anyone.
          </p>
          
          <div class="otp-box">
            <div class="otp-label">Your 6-Digit Password Reset OTP</div>
            <div class="otp-code">${otp}</div>
          </div>
          
          <p class="notice" style="text-align: center; font-weight: 600; color: #0284c7;">
            ⏱️ This OTP is valid for <strong>15 minutes</strong>.
          </p>
          
          <div class="warning-box">
            <strong>⚠️ Security Alert:</strong> Never share this OTP with anyone, including Shop India staff. If you did not request a password reset, please ignore this email — your account remains secure.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Shop India. All rights reserved.<br>
          <span style="font-size:11px;">shopindia36@gmail.com</span>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name || 'Customer'},

We received a request to reset the password for your Shop India account.
Your 6-digit OTP code is: ${otp}

This OTP is valid for 15 minutes.
If you did not request this, please ignore this email.

- The Shop India Team
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
    subject: `Shop India — Password Reset OTP: ${otp}`,
    text: textContent,
    html: htmlContent,
  });

  return {
    sent: true,
    messageId: info.messageId,
  };
}

// ─── Signup OTP Email ─────────────────────────────────────────────────────────

/**
 * Sends an account signup verification OTP email.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - User's name
 * @param {string} options.otp - 6-digit OTP code
 */
async function sendSignupOtpEmail({ to, name, otp }) {
  const transporter = createTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"Shop India" <${process.env.EMAIL_USER || 'shopindia36@gmail.com'}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Shop India</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛍️ Shop India</h1>
          <p>Account Email Verification</p>
        </div>
        <div class="body">
          <p style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0;">
            Welcome, ${name ? name : 'New Customer'}! 🎉
          </p>
          <p class="notice">
            You're just one step away from joining <strong>Shop India</strong>! Please verify your email address using the OTP below to complete your account registration.
          </p>
          
          <div class="otp-box">
            <div class="otp-label">Your 6-Digit Verification OTP</div>
            <div class="otp-code">${otp}</div>
          </div>
          
          <p class="notice" style="text-align: center; font-weight: 600; color: #0284c7;">
            ⏱️ This OTP is valid for <strong>10 minutes</strong>.
          </p>
          
          <div class="success-box">
            <strong>✅ Almost there!</strong> Enter this code on the Shop India registration page to activate your account and start shopping.
          </div>
          
          <div class="warning-box">
            <strong>⚠️ Didn't sign up?</strong> If you didn't create a Shop India account, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Shop India. All rights reserved.<br>
          <span style="font-size:11px;">shopindia36@gmail.com</span>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Welcome to Shop India, ${name || 'Customer'}!

Please verify your email address using this OTP code: ${otp}

This OTP is valid for 10 minutes.
If you did not sign up for Shop India, please ignore this email.

- The Shop India Team
  `.trim();

  if (!transporter) {
    console.log('\n========================================');
    console.log('📧 [MAILER DEV MODE - NO SMTP CONFIGURED]');
    console.log(`To: ${to}`);
    console.log(`Name: ${name}`);
    console.log(`🔑 SIGNUP VERIFICATION OTP: >>> ${otp} <<<`);
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
    subject: `Shop India — Verify Your Email: ${otp}`,
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
  sendSignupOtpEmail,
};

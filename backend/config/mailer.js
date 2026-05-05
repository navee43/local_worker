const nodemailer = require("nodemailer");

// Create transporter using Gmail (or any SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,   // your Gmail address
    pass: process.env.EMAIL_PASS,   // Gmail App Password (NOT your normal password)
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Send welcome email after signup / first Google login
// ─────────────────────────────────────────────────────────────────────────────
async function sendWelcomeEmail(toEmail, userName) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`📧 DEMO: Would send welcome email to ${toEmail}`);
    return;
  }
  

  const mailOptions = {
    from: `"KaamSetu" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "🔨 Welcome to KaamSetu — Your Journey Starts Here!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to KaamSetu</title>
</head>
<body style="margin:0;padding:0;background:#f5ead7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5ead7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1208 0%,#2d1f0a 60%,#3d2b10 100%);padding:40px 40px 32px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:#d4a853;border-radius:12px;padding:12px 16px;">
                    <span style="font-size:24px;">🔨</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="font-size:28px;font-weight:800;color:#d4a853;letter-spacing:-0.5px;">KaamSetu</span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#f5ead7;font-size:28px;font-weight:700;margin:0 0 8px;">
                नमस्ते, ${userName}! 🎉
              </h1>
              <p style="color:#a8895c;font-size:15px;margin:0;">
                Welcome to India's trusted platform for skilled workers
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#2d1f0a;font-size:16px;line-height:1.7;margin:0 0 24px;">
                We're thrilled to have you on board! KaamSetu connects skilled workers with employers across India — making it easier than ever to find work or hire the right person.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e8dcc8;margin:0 0 28px;" />

              <!-- What's next -->
              <h2 style="color:#1a1208;font-size:18px;font-weight:700;margin:0 0 20px;">
                What you can do on KaamSetu:
              </h2>

              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:0 0 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#fef3c7;border-radius:8px;padding:10px 14px;font-size:20px;vertical-align:top;">🔧</td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <strong style="color:#1a1208;font-size:14px;">For Workers</strong><br/>
                          <span style="color:#5c4a2a;font-size:13px;line-height:1.5;">Browse available jobs, send requests, build your profile and grow your career.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#fef3c7;border-radius:8px;padding:10px 14px;font-size:20px;vertical-align:top;">💼</td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <strong style="color:#1a1208;font-size:14px;">For Employers</strong><br/>
                          <span style="color:#5c4a2a;font-size:13px;line-height:1.5;">Post jobs, review worker requests and hire skilled professionals quickly.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#fef3c7;border-radius:8px;padding:10px 14px;font-size:20px;vertical-align:top;">⭐</td>
                        <td style="padding-left:14px;vertical-align:top;">
                          <strong style="color:#1a1208;font-size:14px;">Build Your Reputation</strong><br/>
                          <span style="color:#5c4a2a;font-size:13px;line-height:1.5;">Complete jobs, earn points and build a trusted profile that gets you more work.</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="https://local-worker-1.onrender.com/login"
                       style="background:#d4a853;color:#1a1208;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;display:inline-block;letter-spacing:0.3px;">
                      Go to Your Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Quote -->
              <div style="background:#faf6ef;border-left:3px solid #d4a853;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
                <p style="color:#8c7355;font-size:13px;font-style:italic;margin:0;line-height:1.6;">
                  "Kaarigar ne mujhe 3 din mein pehla kaam dila diya. Ab main apne parivar ka khayal rakh sakta hoon."
                </p>
                <p style="color:#a8895c;font-size:12px;font-weight:600;margin:8px 0 0;">— Ramesh Kumar, Electrician, Delhi</p>
              </div>

              <p style="color:#8c7355;font-size:13px;line-height:1.6;margin:0;">
                If you have any questions, simply reply to this email. i am always happy to help.<br/><br/>
                With ❤️ from the KaamSetu Developer
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5ead7;padding:24px 40px;text-align:center;">
              <p style="color:#a8895c;font-size:12px;margin:0;">
                ©  KaamSetu · Empowering India's Workforce<br/>
                <span style="color:#c4a87a;">हर हुनर को उसकी पहचान मिले</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${toEmail}`);
  } catch (err) {
    // Non-fatal — log but don't crash signup
    console.error("⚠️ Email send error:", err.message);
  }
}

module.exports = { sendWelcomeEmail };
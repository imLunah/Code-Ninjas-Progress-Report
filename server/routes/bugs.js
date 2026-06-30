const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Allow both staff sessions (userId) and parent sessions (parentEmail)
function requireAnySession(req, res, next) {
  if (!req.session.userId && !req.session.parentEmail) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

router.post('/', requireAnySession, async (req, res) => {
  const { type, category, description, screenshot, pageUrl, userAgent, screenSize, timestamp, consoleErrors, reporter } = req.body;
  const isFeature = type === 'feature';

  if (!description?.trim()) {
    return res.status(400).json({ error: 'Description is required.' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Bug report: GMAIL_USER or GMAIL_APP_PASSWORD not configured');
    return res.status(500).json({ error: 'Email not configured on server.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const reporterLine = reporter
      ? `${escHtml(reporter.name || 'Unknown')} · ${escHtml(reporter.role || 'unknown')}${reporter.location ? ' · ' + escHtml(reporter.location) : ''}`
      : 'Unknown';

    const cat = escHtml(category || 'Other');
    const label = isFeature ? 'Feature' : 'Bug';
    const heading = isFeature ? 'Feature Request' : 'Bug Report';
    const subject = `[DojoLink ${label}] [${cat}] ${description.trim().slice(0, 50)}${description.trim().length > 50 ? '…' : ''}`;

    const reportedAt = timestamp
      ? new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' }) + ' PT'
      : new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' }) + ' PT';

    const errorsHtml = Array.isArray(consoleErrors) && consoleErrors.length > 0
      ? `<h3 style="color:#1a2e4a;margin:20px 0 8px">Console Errors</h3>
         <pre style="background:#fff8f8;border:1px solid #fca5a5;padding:12px;border-radius:8px;font-size:11px;white-space:pre-wrap;overflow-wrap:break-word;color:#991b1b">${consoleErrors.map(escHtml).join('\n')}</pre>`
      : '';

    const html = `
      <div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:#1a2e4a;margin-bottom:4px">${heading}</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr><td style="padding:6px 0;color:#888;width:110px">Category</td><td style="padding:6px 0;font-weight:600;color:#1d4ed8">${cat}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Reporter</td><td style="padding:6px 0;font-weight:600">${reporterLine}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Page</td><td style="padding:6px 0">${escHtml(pageUrl || 'Unknown')}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Time</td><td style="padding:6px 0">${reportedAt}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Screen</td><td style="padding:6px 0">${escHtml(screenSize || 'Unknown')}</td></tr>
          <tr><td style="padding:6px 0;color:#888">Browser</td><td style="padding:6px 0;font-size:12px;color:#555">${escHtml(userAgent || 'Unknown')}</td></tr>
        </table>
        <h3 style="color:#1a2e4a;margin-bottom:8px">Description</h3>
        <p style="white-space:pre-wrap;background:#f5f7fa;padding:14px;border-radius:8px;line-height:1.6">${escHtml(description.trim())}</p>
        ${errorsHtml}
        ${screenshot ? '<p style="color:#888;font-size:13px;margin-top:16px">Screenshot attached.</p>' : ''}
      </div>
    `;

    const mailOptions = {
      from: `"DojoLink ${isFeature ? 'Feature Requests' : 'Bug Reports'}" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject,
      html,
    };

    if (screenshot) {
      const commaIdx = screenshot.indexOf(',');
      if (commaIdx !== -1) {
        const header = screenshot.slice(0, commaIdx);
        const data = screenshot.slice(commaIdx + 1);
        const mimeMatch = header.match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
        const ext = mimeType.split('/')[1] || 'png';
        mailOptions.attachments = [{
          filename: `screenshot.${ext}`,
          content: Buffer.from(data, 'base64'),
          encoding: 'base64',
        }];
      }
    }

    await transporter.sendMail(mailOptions);
    res.json({ ok: true });
  } catch (err) {
    console.error('Bug report email error:', err.message);
    res.status(500).json({ error: 'Failed to send report. Please try again.' });
  }
});

module.exports = router;

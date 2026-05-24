import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Email Transport Setup
  let transporter: nodemailer.Transporter | null = null;
  
  const getTransporter = () => {
    if (transporter) return transporter;
    
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT || '587'),
        secure: SMTP_PORT === '465',
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      return transporter;
    }
    return null;
  };

  // API Routes
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, body, html } = req.body;
    
    console.log(`[Email Request] To: ${to}, Subject: ${subject}`);
    
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      try {
        const data = await resend.emails.send({
          from: 'Estate Magic <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: html || `<p>${body}</p>`
        });
        return res.json({ success: true, data });
      } catch (error: any) {
        console.error('Resend error:', error);
        return res.status(500).json({ success: false, error: 'Failed to send email via Resend' });
      }
    }

    const mailTransporter = getTransporter();
    
    if (!mailTransporter) {
      console.warn('SMTP not configured. Email logged to console.');
      return res.json({ 
        success: true, 
        message: 'Email simulated (SMTP not configured)',
        simulated: true 
      });
    }

    try {
      await mailTransporter.sendMail({
        from: process.env.FROM_EMAIL || '"Estate Magic" <noreply@estatemagic.com>',
        to,
        subject,
        text: body,
        html: html || body,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Email error:', error);
      
      // Provide more helpful info for auth failures
      if (error.code === 'EAUTH' || error.message.includes('535')) {
        return res.status(500).json({ 
          success: false, 
          error: 'Authentication failed. If using Outlook/Gmail, please use an App Password instead of your regular password.',
          code: 'AUTH_FAILED'
        });
      }

      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

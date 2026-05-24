/**
 * Client-side utility to send emails via the backend API.
 */
export async function sendEmail({ to, subject, body, html }: { to: string, subject: string, body: string, html?: string }) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body, html }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Email utility error:', error);
    // We don't want email failures to block the UI flow, 
    // so we just log it and return failure status.
    return { success: false, error };
  }
}

/**
 * Common email triggers
 */
export const EmailTriggers = {
  sosAlert: async (houseId: string, residentName: string, adminEmail?: string) => {
    if (!adminEmail) return;
    return sendEmail({
      to: adminEmail,
      subject: `🚨 SOS ALERT: House ${houseId}`,
      body: `Emergency SOS triggered by ${residentName} in House ${houseId}. Please check the security dashboard immediately.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 12px;">
          <h2 style="color: #ef4444; text-transform: uppercase;">🚨 SOS Alert Triggered</h2>
          <p><strong>Resident:</strong> ${residentName}</p>
          <p><strong>Location:</strong> House ${houseId}</p>
          <p style="background: #fee2e2; padding: 10px; border-radius: 6px;">
            An emergency SOS signal has been received from the resident above. Please dispatch security immediately.
          </p>
          <hr />
          <p style="font-size: 11px; color: #6b7280;">Sent via Estate Magic Secure Notification System</p>
        </div>
      `
    });
  },
  
  accountApproved: async (email: string, name: string) => {
    return sendEmail({
      to: email,
      subject: `✅ Account Approved - Estate Magic`,
      body: `Hello ${name}, your resident account has been approved. You can now login to the portal.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #059669;">Welcome to Estate Magic</h2>
          <p>Hello ${name},</p>
          <p>Your account has been officially verified and approved by the estate management.</p>
          <p>You can now use your credentials to login and manage your visitor access and security alerts.</p>
          <div style="margin-top: 20px;">
            <a href="${window.location.origin}" style="background: #059669; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Now</a>
          </div>
          <hr style="margin-top: 30px;" />
          <p style="font-size: 11px; color: #6b7280;">Estate Magic: Secure. Simple. Smart.</p>
        </div>
      `
    });
  },

  accessCodeGenerated: async (email: string, residentName: string, visitorName: string, code: string, expiry: string) => {
    return sendEmail({
      to: email,
      subject: `🔑 New Access Code: ${visitorName}`,
      body: `Hello ${residentName}, a new access code (${code}) has been generated for ${visitorName}. It expires on ${expiry}.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 500px;">
          <h3 style="color: #111827; margin-bottom: 20px; border-bottom: 1px solid #f3f4f6; pb: 10px;">Access Code Generated</h3>
          <p style="font-size: 14px; color: #4b5563;">Hello <strong>${residentName}</strong>,</p>
          <p style="font-size: 14px; color: #4b5563;">A secure entry code has been created for your visitor:</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px;">Visitor</p>
            <p style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0;">${visitorName}</p>
            <p style="font-size: 32px; font-weight: 900; color: #059669; letter-spacing: 0.2em; margin: 10px 0;">${code}</p>
            <p style="font-size: 11px; color: #ef4444; font-weight: bold; text-transform: uppercase;">Expires: ${expiry}</p>
          </div>

          <p style="font-size: 13px; color: #6b7280; font-style: italic;">
            Please share this code with your visitor. They will need to present it to security at the gate for verification.
          </p>
          
          <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p style="font-size: 10px; color: #94a3b8; text-align: center;">Security Managed by Estate Magic</p>
        </div>
      `
    });
  }
};

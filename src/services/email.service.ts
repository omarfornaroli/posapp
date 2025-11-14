import nodemailer from 'nodemailer';
import dbConnect from '@/lib/dbConnect';
import SmtpSetting from '@/models/SmtpSetting';
import type { NextRequest } from 'next/server';

type EmailSendResult = {
  method: 'smtp' | 'log';
};

export class EmailService {
  private static async createTransporter() {
    await dbConnect();
    const settings = await SmtpSetting.findOne({}).select('+pass');

    // Only create a transporter if all required settings from the DB are present
    if (settings && settings.host && settings.port && settings.user && settings.pass) {
      return nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.port === 465, // true for 465, false for other ports
        auth: {
          user: settings.user,
          pass: settings.pass,
        },
      });
    }
    return null; // Return null if not configured in the database
  }

  /**
   * Sends an account setup email to a new user.
   * @param email The recipient's email address.
   * @param token The user's unique setup token.
   * @param invitingUser The user who created the new account.
   */
  public static async sendUserSetupEmail(email: string, token: string, invitingUser?: { name?: string }): Promise<EmailSendResult> {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const setupLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}${basePath}/setup-account/${token}`;

    const subject = "You're invited to join POSAPP!";
    
    // Simple text version
    const text = `
Hello,

You have been invited to create an account for POSAPP by ${invitingUser?.name || 'an administrator'}.

To complete your account setup and create your password, please click the link below:
${setupLink}

This link will expire in 24 hours.

If you did not expect this invitation, you can safely ignore this email.

Thanks,
The POSAPP Team
`;

    // A nicer HTML version
    const html = `
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2 style="color: #8000FF;">Welcome to POSAPP!</h2>
  <p>Hello,</p>
  <p>You have been invited to create an account for POSAPP by <strong>${invitingUser?.name || 'an administrator'}</strong>.</p>
  <p>To complete your account setup and create your password, please click the button below:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${setupLink}" style="background-color: #8000FF; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Up Your Account</a>
  </p>
  <p>This link will expire in 24 hours.</p>
  <p>If you did not expect this invitation, you can safely ignore this email.</p>
  <br/>
  <p>Thanks,<br/>The POSAPP Team</p>
</div>
`;

    return this.sendEmail(email, subject, text, html, setupLink);
  }
  
  /**
   * Sends a password reset email to a user.
   * @param email The recipient's email address.
   * @param token The user's unique reset token.
   */
  public static async sendPasswordResetEmail(email: string, token: string): Promise<EmailSendResult> {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}${basePath}/reset-password/${token}`;

    const subject = "Password Reset Request for POSAPP";
    
    const text = `
Hello,

A password reset was requested for your account. If you did not make this request, you can ignore this email.

To reset your password, please click the link below:
${resetLink}

This link will expire in 1 hour.

Thanks,
The POSAPP Team
`;

    const html = `
<div style="font-family: sans-serif; padding: 20px; color: #333;">
  <h2 style="color: #8000FF;">Password Reset Request</h2>
  <p>Hello,</p>
  <p>A password reset was requested for your account. If you did not make this request, you can ignore this email.</p>
  <p>To reset your password, please click the button below:</p>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${resetLink}" style="background-color: #8000FF; color: white; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Your Password</a>
  </p>
  <p>This link will expire in 1 hour.</p>
  <br/>
  <p>Thanks,<br/>The POSAPP Team</p>
</div>
`;
    return this.sendEmail(email, subject, text, html, resetLink);
  }


  private static async sendEmail(to: string, subject: string, text: string, html: string, linkForLog?: string): Promise<EmailSendResult> {
    const transporter = await this.createTransporter();
    const settings = await SmtpSetting.findOne({});
    const fromAddress = settings?.from || '"POSAPP" <noreply@posapp.example.com>';

    if (transporter) {
      // Send real email
      try {
        await transporter.sendMail({
          from: fromAddress,
          to,
          subject,
          text,
          html,
        });
        console.log(`Email successfully sent to ${to}`);
        return { method: 'smtp' };
      } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
        console.log("Email sending failed. Falling back to console log.");
        this.logEmailToConsole(to, subject, text, linkForLog || 'N/A', fromAddress);
        return { method: 'log' };
      }
    } else {
      // Fallback to console log if not configured
      console.warn("************************************************************");
      console.warn("NOTICE: Email service is not configured in the database.");
      console.warn("Please add SMTP settings in the main application settings.");
      console.warn("Falling back to logging email content to the console.");
      console.warn("************************************************************");
      this.logEmailToConsole(to, subject, text, linkForLog || 'N/A', fromAddress);
      return { method: 'log' };
    }
  }

  private static logEmailToConsole(to: string, subject: string, body: string, link: string, from: string) {
     console.log("--- SIMULATING EMAIL SEND ---");
     console.log(`To: ${to}`);
     console.log(`From: ${from}`);
     console.log(`Subject: ${subject}`);
     console.log(`Body:\n${body}`);
     console.log("--- LINK FOR DEVELOPMENT ---");
     console.log(link);
     console.log("--------------------------------");
  }
}

export default EmailService;
import { NextResponse } from 'next/server';

import { rateLimitTake } from 'src/libs/email/rate-limit';
import { isValidSecret } from 'src/libs/crypto/timing-safe-secret';
import { sendResendEmail } from 'src/libs/email/resend-server-send';
import { RESEND_API, EMAIL_OUTBOUND_SECRET } from 'src/config-global';

// Force Node.js runtime for server-side operations
export const runtime = 'nodejs';

const logger = {
  info: (message, data = {}) => {
    console.log(`[email-api] ${message}`, data);
  },
  error: (message, data = {}) => {
    console.error(`[email-api] ${message}`, data);
  },
};

function getClientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Internal / automation only: requires `Authorization: Bearer <EMAIL_OUTBOUND_SECRET>`.
 * Browser forms use server actions (`sendContactInquiryEmail`, `submitLlmFeedbackEmail`).
 */
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!(await rateLimitTake(`email-api:${ip}`, 30, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!EMAIL_OUTBOUND_SECRET) {
      logger.error('EMAIL_OUTBOUND_SECRET is not set; rejecting /api/email/send');
      return NextResponse.json({ error: 'Email API is not configured.' }, { status: 503 });
    }

    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token || !isValidSecret(token, EMAIL_OUTBOUND_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, subject, html, text } = body;

    if (!to) {
      logger.error('Missing recipient (to field)');
      return NextResponse.json({ error: 'Recipient email address is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!Array.isArray(to)) {
      if (typeof to !== 'string' || !emailRegex.test(to)) {
        logger.error('Invalid email format', { to });
        return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
      }
    } else {
      if (to.length === 0) {
        logger.error('Empty email array provided');
        return NextResponse.json({ error: 'Email array cannot be empty' }, { status: 400 });
      }
      const invalidEmails = to.filter(
        (email) => typeof email !== 'string' || !emailRegex.test(email)
      );
      if (invalidEmails.length > 0) {
        logger.error('Invalid email format in array', { invalidEmails });
        return NextResponse.json(
          { error: 'One or more email addresses are invalid' },
          { status: 400 }
        );
      }
      if (to.length > 10) {
        logger.error('Too many recipients', { count: to.length });
        return NextResponse.json({ error: 'Maximum 10 recipients allowed' }, { status: 400 });
      }
    }

    if (subject && subject.length > 200) {
      logger.error('Subject too long', { length: subject.length });
      return NextResponse.json(
        { error: 'Subject must be 200 characters or less' },
        { status: 400 }
      );
    }

    if (!RESEND_API.key) {
      logger.error('RESEND_API_KEY environment variable not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const fromEmail = RESEND_API.from;

    if (!fromEmail) {
      logger.error('RESEND_FROM_EMAIL environment variable not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const toEmail = to || RESEND_API.to;

    if (!toEmail) {
      logger.error('RESEND_TO_EMAIL environment variable not configured');
      return NextResponse.json(
        { error: 'Email service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    if (!subject || !(html || text)) {
      logger.error('Missing required fields', {
        subject: !!subject,
        html: !!html,
        text: !!text,
      });
      return NextResponse.json(
        { error: 'Missing required fields: subject and either html or text' },
        { status: 400 }
      );
    }

    logger.info('Sending email', {
      to: toEmail,
      from: fromEmail,
      subject,
      hasHtml: !!html,
      hasText: !!text,
    });

    const result = await sendResendEmail({
      to: Array.isArray(toEmail) ? toEmail : [toEmail],
      subject,
      html,
      text,
    });

    return NextResponse.json({
      success: true,
      id: result.data?.id,
      message: 'Email sent successfully',
    });
  } catch (error) {
    logger.error('Failed to send email', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

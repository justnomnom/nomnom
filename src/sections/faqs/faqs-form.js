'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { sendContactInquiryEmail } from 'src/auth/actions/email-actions';

import { varFade, MotionPart, MotionViewport } from 'src/components/animate';

import { sectionLabelSx } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

const TOPIC_IDS = ['support', 'partnership', 'feedback', 'other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  name: '',
  email: '',
  topic: '',
  message: '',
};

// ----------------------------------------------------------------------

FaqsForm.propTypes = {
  titleHeading: PropTypes.oneOf(['h2', 'h3']),
  translationPrefix: PropTypes.string,
  variant: PropTypes.oneOf(['page', 'settings']),
  analyticsLocation: PropTypes.string,
};

/**
 * Contact / FAQ inquiry form — minimal required fields, topic chips, trust line.
 */
export default function FaqsForm({
  /** Page layout: `h2` on standalone /faqs; default `h3` under FAQ list `h2` on home. */
  titleHeading = 'h3',
  translationPrefix = 'pages.faqs.form',
  variant = 'page',
  analyticsLocation = 'faq_section',
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const analytics = useAnalytics();
  const isSettings = variant === 'settings';

  const key = (suffix) => `${translationPrefix}.${suffix}`;

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const validateField = (name, value, current = formData) => {
    if (name === 'email') {
      const email = String(value || '').trim();
      if (!email) return t(key('validation.email_required'));
      if (!EMAIL_RE.test(email)) return t(key('validation.email'));
      return '';
    }
    if (name === 'message') {
      if (!String(value || '').trim()) return t(key('validation.message'));
      return '';
    }
    if (name === 'topic') {
      if (!String(value || current.topic || '').trim()) return t(key('validation.topic'));
      return '';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name] || fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleTopicSelect = (topicId) => {
    setFormData((prev) => ({ ...prev, topic: topicId }));
    setTouched((prev) => ({ ...prev, topic: true }));
    setFieldErrors((prev) => ({ ...prev, topic: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prefer live form values so browser autofill is included even if onChange never fired.
    const fd = new FormData(e.currentTarget);
    const nextData = {
      name: String(fd.get('name') ?? formData.name ?? '').trim(),
      email: String(fd.get('email') ?? formData.email ?? '').trim(),
      message: String(fd.get('message') ?? formData.message ?? '').trim(),
      topic: formData.topic,
    };
    setFormData((prev) => ({ ...prev, ...nextData }));

    const nextErrors = {
      email: validateField('email', nextData.email, nextData),
      message: validateField('message', nextData.message, nextData),
      topic: validateField('topic', nextData.topic, nextData),
    };
    setTouched({ email: true, message: true, topic: true, name: true });
    setFieldErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    setLoading(true);

    const subjectLabel = t(key(`topics.${nextData.topic}`));

    try {
      const result = await sendContactInquiryEmail({
        name: nextData.name,
        email: nextData.email,
        subject: subjectLabel,
        message: nextData.message,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      analytics.trackFormSubmit('faq_contact_form', {
        location: analyticsLocation,
        subject: subjectLabel,
        topic: nextData.topic,
      });

      setNotification({
        open: true,
        message: t(key('success')),
        severity: 'success',
      });

      setFormData(EMPTY_FORM);
      setFieldErrors({});
      setTouched({});
    } catch (error) {
      analytics.trackError(error, {
        location: analyticsLocation,
        form_type: 'contact_form',
        subject: subjectLabel,
        topic: nextData.topic,
      });

      const serverMessage = typeof error?.message === 'string' ? error.message.trim() : '';
      const isUserFacing =
        serverMessage &&
        !serverMessage.startsWith('resend_') &&
        serverMessage !== 'Failed to send email';

      setNotification({
        open: true,
        message: isUserFacing ? serverMessage : t(key('error')),
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const formTitle = isSettings ? (
    <Typography component="h2" sx={sectionLabelSx(theme)} mb={0}>
      {t(key('title'))}
    </Typography>
  ) : (
    <MotionPart variants={varFade().inUp}>
      <Typography
        component={titleHeading}
        variant="h4"
        sx={{
          mb: { xs: 3, md: 5 },
          textAlign: 'center',
          fontSize: { xs: '1.5rem', sm: undefined },
          px: { xs: 1, sm: 0 },
        }}
      >
        {t(key('title'))}
      </Typography>
    </MotionPart>
  );

  const formAlert =
    notification.open && notification.message ? (
      <Alert
        onClose={handleCloseNotification}
        severity={notification.severity}
        variant="outlined"
        role={notification.severity === 'error' ? 'alert' : 'status'}
        aria-live="polite"
        sx={{ width: 1 }}
        action={
          notification.severity === 'success' ? (
            <Button
              component={RouterLink}
              href={paths.home}
              color="inherit"
              size="small"
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {t(key('success_cta'))}
            </Button>
          ) : null
        }
      >
        {notification.message}
      </Alert>
    ) : null;

  const topicChips = (
    <Stack spacing={1} sx={{ width: 1 }}>
      <Typography variant="subtitle2" component="legend" sx={{ fontWeight: 600 }}>
        {t(key('topic_label'))}
      </Typography>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1}
        role="group"
        aria-label={t(key('topic_label'))}
      >
        {TOPIC_IDS.map((topicId) => {
          const selected = formData.topic === topicId;
          return (
            <Chip
              key={topicId}
              label={t(key(`topics.${topicId}`))}
              clickable
              component="button"
              type="button"
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => handleTopicSelect(topicId)}
              aria-pressed={selected}
              sx={{ minHeight: 40, fontWeight: selected ? 700 : 500 }}
            />
          );
        })}
      </Stack>
      {fieldErrors.topic ? (
        <Typography variant="caption" color="error" role="alert">
          {fieldErrors.topic}
        </Typography>
      ) : null}
    </Stack>
  );

  const fields = (
    <>
      {topicChips}

      <TextField
        fullWidth
        name="email"
        type="email"
        label={t(key('email'))}
        placeholder={t(key('email_placeholder'))}
        value={formData.email}
        onChange={handleChange}
        onBlur={handleBlur}
        error={Boolean(fieldErrors.email)}
        helperText={fieldErrors.email || undefined}
        autoComplete="email"
        inputProps={{ inputMode: 'email', 'aria-required': true }}
      />

      <TextField
        fullWidth
        name="name"
        label={t(key('name'))}
        placeholder={t(key('name_placeholder'))}
        value={formData.name}
        onChange={handleChange}
        onBlur={handleBlur}
        autoComplete="name"
        inputProps={{ 'aria-required': false }}
      />

      <TextField
        fullWidth
        name="message"
        label={t(key('message'))}
        placeholder={t(key('message_placeholder'))}
        multiline
        rows={4}
        value={formData.message}
        onChange={handleChange}
        onBlur={handleBlur}
        error={Boolean(fieldErrors.message)}
        helperText={fieldErrors.message || undefined}
        inputProps={{ 'aria-required': true }}
      />

      <Stack spacing={1} sx={{ width: 1 }}>
        {formAlert}
        <Button
          size="large"
          color="primary"
          variant="contained"
          type="submit"
          disabled={loading}
          fullWidth
          sx={{ minHeight: 48 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : t(key('submit'))}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', px: 1 }}>
          {t(key('trust_line'))}
        </Typography>
      </Stack>
    </>
  );

  if (isSettings) {
    return (
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: 1,
          maxWidth: { xs: '100%', md: 600 },
          mx: 'auto',
        }}
      >
        <Stack spacing={2} sx={{ width: 1, alignItems: 'stretch' }}>
          {formTitle}
          {fields}
        </Stack>
      </Box>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        mx: 'auto',
        px: 0,
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', md: '600px' },
          mx: 'auto',
        }}
      >
        <Stack
          spacing={{ xs: 2, md: 3 }}
          component={MotionViewport}
          sx={{
            marginBottom: { xs: '20px', md: '40px' },
            mt: { xs: 2, md: 4 },
            alignItems: 'center',
            width: '100%',
            px: { xs: 0, sm: 0 },
          }}
        >
          {formTitle}
          <MotionPart variants={varFade().inUp} style={{ width: '100%' }}>
            <Stack spacing={2} sx={{ width: 1 }}>
              {fields}
            </Stack>
          </MotionPart>
        </Stack>
      </Box>
    </Container>
  );
}

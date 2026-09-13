'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';
import { SPACE, RADIUS, touchTargetSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

/**
 * Dismissable Get-started card: follow someone, save a spot.
 * Hide the follow row with `showFollow={false}` when Discover has nobody to suggest.
 */
export default function DiscoverActivationChecklist({
  hasFollowed,
  hasSaved,
  showFollow = true,
  onDismiss,
  onFollowCta,
  onSaveCta,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const accent = readableAccent(theme);
  const total = showFollow ? 2 : 1;
  const doneCount = (showFollow ? Number(hasFollowed) : 0) + Number(hasSaved);

  return (
    <Box
      data-testid="e2e-activation-checklist"
      sx={{
        p: SPACE.md,
        borderRadius: `${RADIUS.base}px`,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.05),
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={1}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {t('pages.dashboard.discover.activation_title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {t('pages.dashboard.discover.activation_progress', { done: doneCount, total })}
          </Typography>
        </Box>
        <IconButton
          aria-label={t('pages.dashboard.discover.activation_dismiss')}
          onClick={onDismiss}
          sx={{ width: TOUCH_TARGET_SIZE, height: TOUCH_TARGET_SIZE, mt: -0.5, mr: -0.5 }}
        >
          <Iconify icon={ic.closeLine} width={18} />
        </IconButton>
      </Stack>

      <Stack spacing={0.75} sx={{ mt: 1.5 }}>
        {showFollow ? (
          <ChecklistRow
            done={hasFollowed}
            label={t('pages.dashboard.discover.activation_follow')}
            ctaLabel={t('pages.dashboard.discover.activation_follow_cta')}
            onCta={onFollowCta}
            accent={accent}
          />
        ) : null}
        <ChecklistRow
          done={hasSaved}
          label={t('pages.dashboard.discover.activation_save')}
          ctaLabel={t('pages.dashboard.discover.activation_save_cta')}
          onCta={onSaveCta}
          accent={accent}
        />
      </Stack>
    </Box>
  );
}

DiscoverActivationChecklist.propTypes = {
  hasFollowed: PropTypes.bool,
  hasSaved: PropTypes.bool,
  showFollow: PropTypes.bool,
  onDismiss: PropTypes.func.isRequired,
  onFollowCta: PropTypes.func,
  onSaveCta: PropTypes.func,
};

/**
 * One checklist row with optional jump-to CTA while incomplete.
 */
function ChecklistRow({ done, label, ctaLabel, onCta, accent }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 36 }}>
      <Iconify
        icon={done ? ic.checkCircleBold : ic.checkCircleLinear}
        width={20}
        sx={{ color: done ? accent : 'text.disabled', flexShrink: 0 }}
      />
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          minWidth: 0,
          fontWeight: done ? 600 : 700,
          color: done ? 'text.secondary' : 'text.primary',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {label}
      </Typography>
      {!done && onCta ? (
        <Button
          size="small"
          color="primary"
          onClick={onCta}
          sx={{ fontWeight: 800, flexShrink: 0, ...touchTargetSx, minWidth: 'auto', px: 1.5 }}
        >
          {ctaLabel}
        </Button>
      ) : null}
    </Stack>
  );
}

ChecklistRow.propTypes = {
  done: PropTypes.bool,
  label: PropTypes.string.isRequired,
  ctaLabel: PropTypes.string,
  onCta: PropTypes.func,
  accent: PropTypes.string.isRequired,
};

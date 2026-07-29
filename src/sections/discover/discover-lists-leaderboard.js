'use client';

import { useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { tabularNumsSx } from 'src/theme/spacing';

import { DashboardDelightEmpty } from 'src/components/dashboard';
import RemoteCoverImage from 'src/components/image/remote-cover-image';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';

import { settingsDrillFullBleedStripSx } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

/** Shared empty leaderboard panel (Discover carousel + manage card). */
function LeaderboardEmptyPanel({ titleKey, bodyKey }) {
  const { t } = useTranslate();
  return (
    <DashboardDelightEmpty
      icon={ic.usersGroupRoundedBold}
      title={t(titleKey)}
      body={t(bodyKey)}
      sx={{ py: 3.5 }}
    />
  );
}

LeaderboardEmptyPanel.propTypes = {
  titleKey: PropTypes.string.isRequired,
  bodyKey: PropTypes.string.isRequired,
};

const MODE_INTERACTION = 'interaction';
const MODE_FOLLOWERS = 'followers';

/** `@handle` from leaderboard row for profile links. */
function leaderboardHandle(row) {
  const u = row?.username != null ? String(row.username).trim().replace(/^@/, '') : '';
  return u || null;
}

/**
 * NomNom list contributor leaderboard (Discover: all lists; manage: single list).
 *
 * @param {'discover' | 'listManage'} variant — which translation namespace keys to use.
 */
export default function DiscoverListsLeaderboard({ leaderboard, variant = 'discover' }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const [mode, setMode] = useState(MODE_INTERACTION);
  const tk =
    variant === 'listManage'
      ? {
          title: 'pages.lists.list_leaderboard_title',
          subtitle: 'pages.lists.list_leaderboard_subtitle',
          modeInteraction: 'pages.lists.list_leaderboard_mode_interaction',
          modeFollowers: 'pages.lists.list_leaderboard_mode_followers',
          metricInteraction: 'pages.lists.list_leaderboard_metric_interaction',
          metricFollowers: 'pages.lists.list_leaderboard_metric_followers',
          rank: 'pages.lists.list_leaderboard_rank',
          empty: 'pages.lists.list_leaderboard_empty',
          emptyTitle: 'pages.lists.list_leaderboard_empty_title',
        }
      : {
          title: 'pages.dashboard.discover.lists_leaderboard_title',
          subtitle: 'pages.dashboard.discover.lists_leaderboard_subtitle',
          modeInteraction: 'pages.dashboard.discover.lists_leaderboard_mode_interaction',
          modeFollowers: 'pages.dashboard.discover.lists_leaderboard_mode_followers',
          metricInteraction: 'pages.dashboard.discover.lists_leaderboard_metric_interaction',
          metricFollowers: 'pages.dashboard.discover.lists_leaderboard_metric_followers',
          rank: 'pages.dashboard.discover.lists_leaderboard_rank',
          empty: 'pages.dashboard.discover.lists_leaderboard_empty',
          emptyTitle: 'pages.dashboard.discover.lists_leaderboard_empty_title',
        };

  const rows =
    mode === MODE_FOLLOWERS
      ? (leaderboard?.follower_leaders ?? [])
      : (leaderboard?.interaction_leaders ?? []);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 10);

  if (variant === 'discover') {
    return (
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ gap: 1, minWidth: 0 }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 800,
              minWidth: 0,
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t(tk.title)}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Button
              size="small"
              onClick={() => setMode(MODE_INTERACTION)}
              color={mode === MODE_INTERACTION ? 'primary' : 'inherit'}
              variant={mode === MODE_INTERACTION ? 'contained' : 'text'}
              sx={{
                fontWeight: 700,
                minWidth: 'auto',
                minHeight: { xs: 44 },
                px: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {t(tk.modeInteraction)}
            </Button>
            <Button
              size="small"
              onClick={() => setMode(MODE_FOLLOWERS)}
              color={mode === MODE_FOLLOWERS ? 'primary' : 'inherit'}
              variant={mode === MODE_FOLLOWERS ? 'contained' : 'text'}
              sx={{
                fontWeight: 700,
                minWidth: 'auto',
                minHeight: { xs: 44 },
                px: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {t(tk.modeFollowers)}
            </Button>
          </Stack>
        </Stack>
        {leaderboard?.error ? (
          <Typography variant="body2" color="text.secondary">
            {leaderboard.error}
          </Typography>
        ) : null}
        {rows.length === 0 && !leaderboard?.error ? (
          <LeaderboardEmptyPanel titleKey={tk.emptyTitle} bodyKey={tk.empty} />
        ) : null}
        {rows.length > 0 ? (
          <ScrollableChipRow
            gap={{ xs: 1.5, sm: 2 }}
            sx={{ ...settingsDrillFullBleedStripSx, mb: 0 }}
          >
            {rows.map((row, idx) => {
              const rank = idx + 1;
              const handle = leaderboardHandle(row);
              const handleStr = handle != null ? String(handle) : '';
              const label = handle != null ? `@${handle}` : row.display_name?.trim() || '—';
              const href = handleStr
                ? paths.dashboard.userPublic(handleStr)
                : paths.dashboard.discover;
              const avatarSrc =
                row.avatar_url ||
                (handleStr
                  ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${handleStr}`
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.user_id ?? rank}`);

              return (
                <Box
                  key={row.user_id ?? `${rank}-${label}`}
                  component={RouterLink}
                  href={href}
                  sx={{
                    textAlign: 'center',
                    textDecoration: 'none',
                    color: 'inherit',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      p: '3px',
                      bgcolor: alpha(
                        theme.palette.primary.main,
                        theme.palette.mode === 'light' ? 0.22 : 0.42
                      ),
                      mx: 'auto',
                      mb: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        width: 1,
                        height: 1,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: (tt) => `2px solid ${tt.palette.background.default}`,
                      }}
                    >
                      <RemoteCoverImage
                        src={avatarSrc}
                        alt={t('pages.dashboard.discover.creator_avatar_alt', {
                          handle: label,
                        })}
                        fill
                        sizes="72px"
                      />
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    color={handle != null ? 'primary' : 'text.primary'}
                    sx={{ fontWeight: 700, display: 'block', maxWidth: 88, mx: 'auto' }}
                    noWrap
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 600,
                      display: 'block',
                      maxWidth: 88,
                      mx: 'auto',
                      ...tabularNumsSx,
                    }}
                    noWrap
                  >
                    {t(tk.rank, { rank })}
                  </Typography>
                </Box>
              );
            })}
          </ScrollableChipRow>
        ) : null}
      </Stack>
    );
  }

  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t(tk.title)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {t(tk.subtitle)}
          </Typography>
        </Box>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Chip
            label={t(tk.modeInteraction)}
            onClick={() => setMode(MODE_INTERACTION)}
            color={mode === MODE_INTERACTION ? 'primary' : 'default'}
            variant={mode === MODE_INTERACTION ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={t(tk.modeFollowers)}
            onClick={() => setMode(MODE_FOLLOWERS)}
            color={mode === MODE_FOLLOWERS ? 'primary' : 'default'}
            variant={mode === MODE_FOLLOWERS ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
        </Stack>
        {leaderboard?.error ? (
          <Typography variant="body2" color="text.secondary">
            {leaderboard.error}
          </Typography>
        ) : null}
        {rows.length === 0 && !leaderboard?.error ? (
          <LeaderboardEmptyPanel titleKey={tk.emptyTitle} bodyKey={tk.empty} />
        ) : null}
        {top3.length > 0 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: 'stretch' }}
          >
            {top3.map((row, idx) => {
              const rank = idx + 1;
              const handle = leaderboardHandle(row);
              const label = handle != null ? `@${handle}` : row.display_name?.trim() || '—';
              return (
                <Card
                  key={row.user_id ?? `${rank}-${label}`}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.06),
                    borderColor: 'divider',
                  }}
                >
                  <Stack spacing={1} alignItems="center" textAlign="center">
                    <Typography
                      variant="caption"
                      color="primary"
                      sx={{ fontWeight: 800, ...tabularNumsSx }}
                    >
                      {t(tk.rank, { rank })}
                    </Typography>
                    <Avatar src={row.avatar_url || undefined} alt="" sx={{ width: 56, height: 56 }}>
                      {(handle || row.display_name || '?')
                        .toString()
                        .replace(/^@/, '')
                        .slice(0, 1)
                        .toUpperCase()}
                    </Avatar>
                    {handle != null ? (
                      <Link
                        component={RouterLink}
                        href={paths.dashboard.userPublic(handle)}
                        underline="hover"
                        color="primary"
                        sx={{ fontWeight: 700, typography: 'body2' }}
                      >
                        {label}
                      </Link>
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {label}
                      </Typography>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
        {rest.length > 0 && (
          <Stack divider={<Divider flexItem />} spacing={1}>
            {rest.map((row, idx) => {
              const rank = idx + 4;
              const handle = leaderboardHandle(row);
              const label = handle != null ? `@${handle}` : row.display_name?.trim() || '—';
              return (
                <Stack
                  key={row.user_id ?? `${rank}-${label}`}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ minWidth: 28, ...tabularNumsSx }}
                  >
                    {rank}.
                  </Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    {handle != null ? (
                      <Link
                        component={RouterLink}
                        href={paths.dashboard.userPublic(handle)}
                        underline="hover"
                        color="primary"
                        sx={{ fontWeight: 700 }}
                        noWrap
                        display="block"
                      >
                        {label}
                      </Link>
                    ) : (
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {label}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

DiscoverListsLeaderboard.propTypes = {
  variant: PropTypes.oneOf(['discover', 'listManage']),
  leaderboard: PropTypes.shape({
    interaction_leaders: PropTypes.array,
    follower_leaders: PropTypes.array,
    error: PropTypes.string,
  }),
};

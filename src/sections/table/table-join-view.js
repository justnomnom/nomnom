'use client';

import PropTypes from 'prop-types';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { ic } from 'src/assets/icons';
import { useLocales, useTranslate } from 'src/locales';
import { SPACE, touchTargetSx } from 'src/theme/spacing';
import { useTableAnalytics } from 'src/libs/analytics/table-analytics';
import { nameGuest, fetchTable } from 'src/libs/lists/actions/table-actions';
import {
  readTableNamed,
  readCachedTable,
  summarizeGuests,
  tableErrorMessage,
  persistTableNamed,
  persistCachedTable,
  getOrCreateGuestKey,
  guestHasDisplayName,
  formatTableWhenLabel,
} from 'src/libs/lists/table-client';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const CARD_SX = { p: SPACE.md, borderRadius: 2 };

/**
 * `/table/[id]/join` — name yourself before the vote page will let you in.
 */
export default function TableJoinView({ tableId }) {
  const { t } = useTranslate();
  const { currentLang } = useLocales();
  const router = useRouter();
  const analytics = useTableAnalytics();
  const guestKeyRef = useRef(null);

  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [guestKey, setGuestKey] = useState('');

  useEffect(() => {
    const key = getOrCreateGuestKey();
    guestKeyRef.current = key;
    setGuestKey(key);
  }, []);

  const applyTable = useCallback((next) => {
    if (!next) return;
    setTable(next);
    setErr(null);
  }, []);

  useEffect(() => {
    if (table) persistCachedTable(table);
  }, [table]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = readCachedTable(tableId);
      if (cached?.table_id) {
        setTable(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
      const { table: next, error } = await fetchTable(tableId);
      if (cancelled) return;
      setLoading(false);
      if (error || !next) {
        if (!error || error === 'table_not_found') setTable(null);
        setErr(error || 'table_not_found');
        return;
      }
      applyTable(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [tableId, applyTable]);

  const guests = useMemo(() => (Array.isArray(table?.guests) ? table.guests : []), [table?.guests]);
  const guestSummary = useMemo(() => summarizeGuests(guests), [guests]);
  const locked = table?.decide?.status === 'locked';
  const hasNamed = Boolean(
    guestKey && (readTableNamed(tableId) || guestHasDisplayName(guests, guestKey))
  );
  const whenLabel = formatTableWhenLabel(table?.starts_at, t, {
    locale: currentLang.adapterLocale,
  });

  useEffect(() => {
    if (loading || !table || !guestKey) return;
    if (locked || hasNamed) {
      router.replace(paths.table(tableId));
    }
  }, [loading, table, guestKey, locked, hasNamed, router, tableId]);

  const handleName = useCallback(async () => {
    if (nameBusy || !displayName.trim()) return;
    const key = guestKeyRef.current || getOrCreateGuestKey();
    guestKeyRef.current = key;
    setGuestKey(key);
    setNameBusy(true);
    setErr(null);
    const { table: next, error } = await nameGuest({
      tableId,
      guestKey: key,
      displayName,
    });
    setNameBusy(false);
    if (error || !next) {
      setErr(error || 'unknown');
      return;
    }
    persistTableNamed(String(next.table_id || tableId));
    applyTable(next);
    analytics.trackTableNamed({ table_id: String(next.table_id || tableId) });
    router.replace(paths.table(String(next.table_id || tableId)));
  }, [nameBusy, tableId, displayName, applyTable, analytics, router]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: SPACE.xl, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Container>
    );
  }

  if (!table) {
    return (
      <Container maxWidth="sm" sx={{ py: SPACE.xl }}>
        <Card variant="outlined" sx={CARD_SX}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('pages.table.not_found_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xs }}>
            {tableErrorMessage(err || 'table_not_found', t)}
          </Typography>
        </Card>
      </Container>
    );
  }

  if (locked || hasNamed) {
    return (
      <Container maxWidth="sm" sx={{ py: SPACE.xl, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress color="primary" />
      </Container>
    );
  }

  const whosAtTable = (() => {
    if (guestSummary.count === 0) return t('pages.table.whos_at_table_empty');
    const parts = [...guestSummary.names];
    if (guestSummary.anonymous > 0) {
      parts.push(t('pages.table.anon_suffix', { count: guestSummary.anonymous }));
    }
    return `${t('pages.table.whos_at_table', { count: guestSummary.count })} · ${parts.join(', ')}`;
  })();

  return (
    <Container maxWidth="sm" sx={{ py: SPACE.lg }}>
      <Stack spacing={SPACE.md}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {table.title || t('pages.table.default_title')}
          </Typography>
          {whenLabel ? (
            <Stack direction="row" spacing={SPACE.xxs} alignItems="center" sx={{ mt: SPACE.xxs }}>
              <Iconify
                icon={ic.clockCircleOutline}
                width={16}
                sx={{ color: 'text.secondary', flexShrink: 0 }}
              />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {whenLabel}
              </Typography>
            </Stack>
          ) : null}
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xxs }}>
            {t('pages.table.subtitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: SPACE.xs }}>
            {whosAtTable}
          </Typography>
        </Box>

        {err ? (
          <Typography variant="body2" color="error">
            {tableErrorMessage(err, t)}
          </Typography>
        ) : null}

        <Card variant="outlined" sx={CARD_SX}>
          <Stack
            component="form"
            spacing={SPACE.sm}
            onSubmit={(event) => {
              event.preventDefault();
              handleName();
            }}
          >
            <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700 }}>
              {t('pages.table.name_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('pages.table.name_hint')}
            </Typography>
            <TextField
              fullWidth
              autoFocus
              size="small"
              label={t('pages.table.name_label')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={nameBusy}
              inputProps={{ maxLength: 80, autoComplete: 'nickname' }}
            />
            <Button
              type="submit"
              size="large"
              variant="contained"
              color="primary"
              disabled={nameBusy || !displayName.trim()}
              sx={touchTargetSx}
            >
              {t('pages.table.name_cta')}
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

TableJoinView.propTypes = {
  tableId: PropTypes.string.isRequired,
};

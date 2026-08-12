'use client';

import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useRef, Fragment, useState, useEffect, useTransition } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import Autocomplete from '@mui/material/Autocomplete';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { tabularNumsSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { searchAdminRestaurantsForSelectAction } from 'src/auth/actions/admin-reference-actions';
import {
  createSponsoredPlacementAction,
  deleteSponsoredPlacementAction,
  updateSponsoredPlacementAction,
} from 'src/auth/actions/sponsored-placement-actions';

import dynamic from 'next/dynamic';

import DeleteDialog from 'src/components/custom-dialog/delete-dialog';

import { SettingsDrillShell } from 'src/sections/profile/view';

const DateRangePicker = dynamic(() => import('src/components/date-range-picker'), { ssr: false });

// ----------------------------------------------------------------------

function labelFromCityEmbed(c) {
  if (!c || typeof c !== 'object') return '';
  const st = Array.isArray(c.states) ? c.states[0] : c.states;
  const co = Array.isArray(st?.countries) ? st.countries[0] : st?.countries;
  const name = c.name != null ? String(c.name) : '';
  const state = st?.name != null ? String(st.name) : '';
  const country = co?.name != null ? String(co.name) : '';
  const parts = [name, state, country].filter(Boolean);
  return parts.join(' · ') || name;
}

function labelFromRestaurantEmbed(r) {
  if (!r || typeof r !== 'object') return '';
  const name = r.name != null ? String(r.name) : '';
  const addr = r.address != null ? String(r.address) : '';
  return addr ? `${name} — ${addr}` : name;
}

/** Geography `states` row (sponsored scope), not city.states */
function labelFromGeographyStateEmbed(s) {
  if (!s || typeof s !== 'object') return '';
  const co = Array.isArray(s.countries) ? s.countries[0] : s.countries;
  const name = s.name != null ? String(s.name) : '';
  const country = co?.name != null ? String(co.name) : '';
  const parts = [name, country].filter(Boolean);
  return parts.join(' · ') || name;
}

function labelPlacementScope(row) {
  if (row.state_id) {
    const lb = labelFromGeographyStateEmbed(row.states);
    return lb || String(row.state_id);
  }
  const lb = labelFromCityEmbed(row.cities);
  return lb || String(row.city_id ?? '');
}

/** @returns {[Date, Date] | [Date, null] | [null, Date] | null} */
function validIsoPairToRangeValue(validFromIso, validUntilIso) {
  const hasFrom = validFromIso != null && String(validFromIso).trim();
  const hasUntil = validUntilIso != null && String(validUntilIso).trim();
  if (!hasFrom && !hasUntil) return null;
  const start = hasFrom ? dayjs(validFromIso).startOf('day').toDate() : null;
  const end = hasUntil ? dayjs(validUntilIso).startOf('day').toDate() : null;
  return [start, end];
}

function rangeValueToValidIsoPair(range) {
  if (!range || !Array.isArray(range) || range.length !== 2) {
    return { validFrom: null, validUntil: null };
  }
  const [start, end] = range;
  const validFrom =
    start instanceof Date && !Number.isNaN(start.getTime())
      ? dayjs(start).startOf('day').toISOString()
      : null;
  const validUntil =
    end instanceof Date && !Number.isNaN(end.getTime())
      ? dayjs(end).endOf('day').toISOString()
      : null;
  return { validFrom, validUntil };
}

function getPlacementRunStatus(row) {
  if (!row.active) return 'paused';
  const now = Date.now();
  if (row.valid_from) {
    const t = new Date(row.valid_from).getTime();
    if (Number.isFinite(t) && now < t) return 'scheduled';
  }
  if (row.valid_until) {
    const t = new Date(row.valid_until).getTime();
    if (Number.isFinite(t) && now >= t) return 'ended';
  }
  return 'live';
}

function placementStatusChipColor(status) {
  if (status === 'live') return 'success';
  if (status === 'scheduled') return 'info';
  if (status === 'ended') return 'default';
  return 'warning';
}

function PlacementRunStatusChip({ row, tk }) {
  const status = getPlacementRunStatus(row);
  const color = placementStatusChipColor(status);
  return (
    <Chip
      size="small"
      label={tk(`status_${status}`)}
      color={color}
      variant={status === 'ended' ? 'outlined' : 'filled'}
    />
  );
}

PlacementRunStatusChip.propTypes = {
  row: PropTypes.object.isRequired,
  tk: PropTypes.func.isRequired,
};

function PlacementScheduleEditor({
  rowId,
  validFromIso = null,
  validUntilIso = null,
  disabled = false,
  fieldSize = 'small',
  layout = 'inline',
  tk,
  onSave,
}) {
  const [rangeValue, setRangeValue] = useState(() =>
    validIsoPairToRangeValue(validFromIso, validUntilIso)
  );

  useEffect(() => {
    setRangeValue(validIsoPairToRangeValue(validFromIso, validUntilIso));
  }, [rowId, validFromIso, validUntilIso]);

  const isStacked = layout === 'stacked';
  const pickerSize = fieldSize === 'medium' ? 'middle' : 'small';

  return (
    <Stack
      direction={isStacked ? 'column' : 'row'}
      spacing={isStacked ? 1.5 : 1.25}
      flexWrap="wrap"
      alignItems={isStacked ? 'stretch' : 'flex-end'}
      sx={{ flex: isStacked ? undefined : 1, minWidth: 0 }}
    >
      <Box sx={{ width: 1, flex: isStacked ? undefined : 1, minWidth: { xs: 1, md: 260 } }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          {tk('schedule_range_label')}
        </Typography>
        <DateRangePicker
          value={rangeValue}
          onChange={setRangeValue}
          disabled={disabled}
          showOneCalendar={isStacked}
          size={pickerSize}
          presets={[]}
          style={{ width: '100%' }}
          startDatePlaceholder={tk('valid_from')}
          dueDatePlaceholder={tk('valid_until')}
        />
      </Box>
      <Button
        variant="outlined"
        onClick={() => onSave(rangeValueToValidIsoPair(rangeValue))}
        disabled={disabled}
        size={isStacked ? 'medium' : 'small'}
        sx={{
          minHeight: isStacked ? TOUCH_TARGET_SIZE : undefined,
          alignSelf: isStacked ? 'stretch' : 'center',
        }}
      >
        {tk('update_schedule')}
      </Button>
    </Stack>
  );
}

PlacementScheduleEditor.propTypes = {
  rowId: PropTypes.string.isRequired,
  validFromIso: PropTypes.string,
  validUntilIso: PropTypes.string,
  disabled: PropTypes.bool,
  fieldSize: PropTypes.string,
  layout: PropTypes.oneOf(['stacked', 'inline']),
  tk: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default function SponsoredPlacementsAdminView({
  initialRows = [],
  cityOptions = [],
  stateOptions = [],
}) {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslate();
  const [geoScope, setGeoScope] = useState('city');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  /** Typing in restaurant field only (not the selected option label) — drives server search. */
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [restaurantOptions, setRestaurantOptions] = useState([]);
  const [restaurantLoading, setRestaurantLoading] = useState(false);
  const [pinSort, setPinSort] = useState('0');
  const [injectAfter, setInjectAfter] = useState('');
  const [scheduleRangeAdd, setScheduleRangeAdd] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const tk = (k) => t(`pages.dashboard.admin.sponsored_placements.${k}`);
  const tkRef = useRef(tk);
  tkRef.current = tk;
  const fieldSize = isNarrow ? 'medium' : 'small';

  const geographyIdForSearch = geoScope === 'state' ? selectedState?.id : selectedCity?.id;

  useEffect(() => {
    if (!geographyIdForSearch) {
      setRestaurantOptions([]);
      setSelectedRestaurant(null);
      setRestaurantQuery('');
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      setRestaurantLoading(true);
      searchAdminRestaurantsForSelectAction({
        scope: geoScope,
        geographyId: geographyIdForSearch,
        query: restaurantQuery,
        limit: 50,
      }).then((res) => {
        if (cancelled) return;
        setRestaurantLoading(false);
        if (res.error) {
          setMessage(res.error === 'forbidden' ? tkRef.current('save_error') : String(res.error));
          setRestaurantOptions([]);
          return;
        }
        setRestaurantOptions(res.restaurants ?? []);
      });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [geoScope, geographyIdForSearch, restaurantQuery]);

  const handleAdd = () => {
    setMessage('');
    const geographyId = geographyIdForSearch ?? '';
    const restaurantId = selectedRestaurant?.id ?? '';
    const pin = Number(pinSort);
    const injectRaw = injectAfter.trim();
    const injectAfterOrganic = injectRaw === '' ? null : Number(injectRaw);
    if (injectRaw !== '' && (!Number.isFinite(injectAfterOrganic) || injectAfterOrganic < 0)) {
      setMessage(tk('save_error'));
      return;
    }
    startTransition(async () => {
      setBusy(true);
      const { validFrom, validUntil } = rangeValueToValidIsoPair(scheduleRangeAdd);
      const res = await createSponsoredPlacementAction({
        scope: geoScope,
        geographyId,
        restaurantId,
        pinSortOrder: Number.isFinite(pin) ? pin : 0,
        injectAfterOrganic,
        active: true,
        validFrom,
        validUntil,
      });
      setBusy(false);
      if (!res.ok) {
        setMessage(res.error || tk('save_error'));
        return;
      }
      setSelectedCity(null);
      setSelectedState(null);
      setSelectedRestaurant(null);
      setRestaurantQuery('');
      setRestaurantOptions([]);
      setPinSort('0');
      setInjectAfter('');
      setScheduleRangeAdd(null);
    });
  };

  const handleUpdateSchedule = (id, { validFrom, validUntil }) => {
    setMessage('');
    startTransition(async () => {
      setBusy(true);
      const res = await updateSponsoredPlacementAction(id, { validFrom, validUntil });
      setBusy(false);
      if (!res.ok) {
        setMessage(res.error || tk('save_error'));
      }
    });
  };

  const handleDelete = (id) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    const id = pendingDeleteId;
    if (!id) return;
    setPendingDeleteId(null);
    setMessage('');
    startTransition(async () => {
      setBusy(true);
      const res = await deleteSponsoredPlacementAction(id);
      setBusy(false);
      if (!res.ok) {
        setMessage(res.error || tk('save_error'));
      }
    });
  };

  const handleToggleActive = (row) => {
    setMessage('');
    startTransition(async () => {
      setBusy(true);
      const res = await updateSponsoredPlacementAction(row.id, { active: !row.active });
      setBusy(false);
      if (!res.ok) {
        setMessage(res.error || tk('save_error'));
      }
    });
  };

  const canSubmit = Boolean(geographyIdForSearch && selectedRestaurant?.id) && !busy && !isPending;

  const placementsTableHead = (
    <TableRow>
      <TableCell>{tk('col_scope')}</TableCell>
      <TableCell>{tk('col_restaurant')}</TableCell>
      <TableCell align="right">{tk('col_pin')}</TableCell>
      <TableCell align="right">{tk('col_inject')}</TableCell>
      <TableCell>{tk('active')}</TableCell>
      <TableCell align="right" />
    </TableRow>
  );

  const placementsEmptyRow = (
    <TableRow>
      <TableCell colSpan={6} sx={{ py: 4 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          {tk('empty')}
        </Typography>
      </TableCell>
    </TableRow>
  );

  const placementsEmptyNarrow = (
    <Card variant="outlined" sx={{ p: 4, borderRadius: 2 }}>
      <Typography variant="body2" color="text.secondary" align="center">
        {tk('empty')}
      </Typography>
    </Card>
  );

  const renderPlacementsTable = (body) => (
    <Card variant="outlined" sx={{ p: 0, overflow: 'auto', borderRadius: 2 }}>
      <Table size="small" sx={{ minWidth: 880 }}>
        <TableHead>{placementsTableHead}</TableHead>
        <TableBody>{body}</TableBody>
      </Table>
    </Card>
  );

  return (
    <SettingsDrillShell
      title={tk('heading')}
      compactToolbar
      backHref={paths.dashboard.admin}
      backAriaLabel={tk('back_to_admin')}
    >
      <Stack spacing={isNarrow ? 2.5 : 3} sx={{ width: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {tk('sub')}
        </Typography>

        {message ? (
          <Alert severity="error" variant="outlined" role="alert">
            {message}
          </Alert>
        ) : null}

        <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
            {tk('add')}
          </Typography>
          <Stack spacing={2.25}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {tk('scope_label')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth={isNarrow}
                size={isNarrow ? 'medium' : 'small'}
                color="primary"
                value={geoScope}
                onChange={(_, v) => {
                  if (v != null) {
                    setGeoScope(v);
                    setSelectedCity(null);
                    setSelectedState(null);
                    setSelectedRestaurant(null);
                    setRestaurantQuery('');
                  }
                }}
                sx={{ flexWrap: 'wrap' }}
              >
                <ToggleButton value="city" sx={{ flex: isNarrow ? 1 : undefined }}>
                  {tk('scope_city')}
                </ToggleButton>
                <ToggleButton value="state" sx={{ flex: isNarrow ? 1 : undefined }}>
                  {tk('scope_state')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {geoScope === 'city' ? (
              <Autocomplete
                fullWidth
                size={fieldSize}
                options={cityOptions}
                value={selectedCity}
                onChange={(_, v) => {
                  setSelectedCity(v);
                  setSelectedRestaurant(null);
                  setRestaurantQuery('');
                }}
                getOptionLabel={(o) => (o?.label ? o.label : '')}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={tk('city_field')}
                    placeholder={tk('city_search_placeholder')}
                    InputProps={{
                      ...params.InputProps,
                      sx: isNarrow ? { minHeight: 48 } : undefined,
                    }}
                  />
                )}
                ListboxProps={{ sx: { maxHeight: 280 } }}
              />
            ) : (
              <Autocomplete
                fullWidth
                size={fieldSize}
                options={stateOptions}
                value={selectedState}
                onChange={(_, v) => {
                  setSelectedState(v);
                  setSelectedRestaurant(null);
                  setRestaurantQuery('');
                }}
                getOptionLabel={(o) => (o?.label ? o.label : '')}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={tk('state_field')}
                    placeholder={tk('state_search_placeholder')}
                    InputProps={{
                      ...params.InputProps,
                      sx: isNarrow ? { minHeight: 48 } : undefined,
                    }}
                  />
                )}
                ListboxProps={{ sx: { maxHeight: 280 } }}
              />
            )}

            <Autocomplete
              fullWidth
              size={fieldSize}
              disabled={!geographyIdForSearch}
              options={restaurantOptions}
              value={selectedRestaurant}
              onChange={(_, v) => setSelectedRestaurant(v)}
              onInputChange={(_, v, reason) => {
                if (reason === 'input') {
                  setRestaurantQuery(v);
                }
                if (reason === 'clear') {
                  setRestaurantQuery('');
                  setSelectedRestaurant(null);
                }
              }}
              getOptionLabel={(o) => {
                if (!o || typeof o !== 'object') return '';
                const name = o.name != null ? String(o.name) : '';
                const addr = o.address != null ? String(o.address) : '';
                return addr ? `${name} — ${addr}` : name;
              }}
              isOptionEqualToValue={(a, b) => a?.id === b?.id}
              filterOptions={(opts) => opts}
              loading={restaurantLoading}
              noOptionsText={
                geographyIdForSearch ? tk('restaurant_no_results') : tk('select_geography_first')
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={tk('restaurant_field')}
                  placeholder={tk('restaurant_search_placeholder')}
                  helperText={!geographyIdForSearch ? tk('select_geography_first') : undefined}
                  InputProps={{
                    ...params.InputProps,
                    sx: isNarrow ? { minHeight: 48 } : undefined,
                    endAdornment: (
                      <>
                        {restaurantLoading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                            <SkeletonTheme
                              baseColor={
                                theme.palette.mode === 'dark'
                                  ? alpha(theme.palette.common.white, 0.09)
                                  : alpha(theme.palette.common.black, 0.07)
                              }
                              highlightColor={
                                theme.palette.mode === 'dark'
                                  ? alpha(theme.palette.common.white, 0.18)
                                  : alpha(theme.palette.common.black, 0.12)
                              }
                            >
                              <Skeleton circle width={18} height={18} />
                            </SkeletonTheme>
                          </Box>
                        ) : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              ListboxProps={{ sx: { maxHeight: 280 } }}
            />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'stretch', sm: 'flex-end' } }}
            >
              <TextField
                label={tk('pin_sort')}
                value={pinSort}
                onChange={(e) => setPinSort(e.target.value)}
                size={fieldSize}
                type="number"
                fullWidth
                sx={{ maxWidth: { sm: 160 } }}
                InputProps={{ sx: isNarrow ? { minHeight: 48 } : undefined }}
              />
              <TextField
                label={tk('inject_after')}
                value={injectAfter}
                onChange={(e) => setInjectAfter(e.target.value)}
                size={fieldSize}
                type="number"
                fullWidth
                sx={{ flex: 1 }}
                InputLabelProps={{ shrink: true }}
                InputProps={{ sx: isNarrow ? { minHeight: 48 } : undefined }}
              />
            </Stack>

            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {tk('schedule_range_label')}
              </Typography>
              <DateRangePicker
                value={scheduleRangeAdd}
                onChange={setScheduleRangeAdd}
                disabled={busy || isPending}
                showOneCalendar={isNarrow}
                size={isNarrow ? 'middle' : 'middle'}
                presets={[]}
                style={{ width: '100%' }}
                startDatePlaceholder={tk('valid_from')}
                dueDatePlaceholder={tk('valid_until')}
              />
              <Typography variant="caption" color="text.secondary">
                {tk('schedule_dates_hint')}
              </Typography>
            </Stack>
          </Stack>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!canSubmit}
            fullWidth={isNarrow}
            size={isNarrow ? 'large' : 'medium'}
            startIcon={
              busy || isPending ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{ mt: 2.5, minHeight: isNarrow ? 48 : 40 }}
          >
            {tk('add')}
          </Button>
        </Card>

        {isNarrow ? (
          <Stack spacing={2}>
            {initialRows.length === 0
              ? placementsEmptyNarrow
              : initialRows.map((row) => (
                  <Card key={row.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {tk('col_scope')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {row.state_id ? tk('scope_state') : tk('scope_city')}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5, wordBreak: 'break-word' }}>
                      {labelPlacementScope(row)}
                    </Typography>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {tk('col_restaurant')}
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1.5, wordBreak: 'break-word' }}>
                      {labelFromRestaurantEmbed(row.restaurants) || row.restaurant_id}
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {tk('col_pin')}
                        </Typography>
                        <Typography variant="body2">{row.pin_sort_order}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {tk('col_inject')}
                        </Typography>
                        <Typography variant="body2">
                          {row.inject_after_organic == null ? '—' : row.inject_after_organic}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <PlacementRunStatusChip row={row} tk={tk} />
                    </Stack>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(row.active)}
                          onChange={() => handleToggleActive(row)}
                          disabled={busy || isPending}
                          inputProps={{ 'aria-label': tk('toggle_active') }}
                        />
                      }
                      label={tk('active')}
                      sx={{ mb: 1.5, ml: 0 }}
                    />
                    <PlacementScheduleEditor
                      rowId={row.id}
                      validFromIso={row.valid_from}
                      validUntilIso={row.valid_until}
                      disabled={busy || isPending}
                      fieldSize={fieldSize}
                      layout="stacked"
                      tk={tk}
                      onSave={(payload) => handleUpdateSchedule(row.id, payload)}
                    />
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      size="medium"
                      onClick={() => handleDelete(row.id)}
                      disabled={busy || isPending}
                      sx={{ minHeight: TOUCH_TARGET_SIZE, mt: 1.5 }}
                    >
                      {tk('delete')}
                    </Button>
                  </Card>
                ))}
          </Stack>
        ) : (
          renderPlacementsTable(
            initialRows.length === 0
              ? placementsEmptyRow
              : initialRows.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow hover>
                      <TableCell sx={{ maxWidth: 240 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.state_id ? tk('scope_state') : tk('scope_city')}
                        </Typography>
                        <Typography variant="body2" noWrap title={labelPlacementScope(row)}>
                          {labelPlacementScope(row)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={labelFromRestaurantEmbed(row.restaurants)}
                        >
                          {labelFromRestaurantEmbed(row.restaurants) || row.restaurant_id}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={tabularNumsSx}>
                        {row.pin_sort_order}
                      </TableCell>
                      <TableCell align="right" sx={tabularNumsSx}>
                        {row.inject_after_organic == null ? '—' : row.inject_after_organic}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <PlacementRunStatusChip row={row} tk={tk} />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={Boolean(row.active)}
                                onChange={() => handleToggleActive(row)}
                                disabled={busy || isPending}
                                inputProps={{ 'aria-label': tk('toggle_active') }}
                              />
                            }
                            label=""
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDelete(row.id)}
                          disabled={busy || isPending}
                        >
                          {tk('delete')}
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow
                      sx={{
                        '& td': {
                          borderTop: 0,
                          pt: 0,
                          pb: 2,
                          bgcolor: (muiTheme) =>
                            muiTheme.palette.mode === 'dark'
                              ? alpha(muiTheme.palette.common.white, 0.04)
                              : alpha(muiTheme.palette.common.black, 0.02),
                        },
                      }}
                    >
                      <TableCell colSpan={6}>
                        <PlacementScheduleEditor
                          rowId={row.id}
                          validFromIso={row.valid_from}
                          validUntilIso={row.valid_until}
                          disabled={busy || isPending}
                          fieldSize="small"
                          layout="inline"
                          tk={tk}
                          onSave={(payload) => handleUpdateSchedule(row.id, payload)}
                        />
                      </TableCell>
                    </TableRow>
                  </Fragment>
                ))
          )
        )}
      </Stack>
      <DeleteDialog
        open={pendingDeleteId != null}
        onClose={() => {
          if (!busy && !isPending) setPendingDeleteId(null);
        }}
        onConfirm={confirmDelete}
        isDeleting={busy || isPending}
        title={tk('delete_confirm_title')}
        confirmationMessage={tk('delete_confirm_body')}
        confirmButtonText={tk('confirm_delete')}
        cancelButtonText={tk('cancel')}
      />
    </SettingsDrillShell>
  );
}

SponsoredPlacementsAdminView.propTypes = {
  initialRows: PropTypes.arrayOf(PropTypes.object),
  cityOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ),
  stateOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ),
};

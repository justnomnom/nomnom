'use client';

import PropTypes from 'prop-types';
import { useMemo, useCallback } from 'react';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Slider from '@mui/material/Slider';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import useMediaQuery from '@mui/material/useMediaQuery';

import {
  RESTAURANT_TAG_SECTION_I18N,
  getRestaurantTagDisplayLabel,
} from 'src/utils/restaurant-tag-groups';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { RADIUS } from 'src/theme/spacing';
import { hoverable } from 'src/theme/overrides/hoverable';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';
import { mobileStretchButtonSx } from 'src/theme/responsive-button-sx';

import Iconify from 'src/components/iconify';
import {
  SheetHeaderRow,
  SheetGrabBarRail,
  sheetBodyScrollSx,
  sheetDragHandleProps,
  SheetCloseIconButton,
  desktopSheetDialogPaperSx,
  mobileBottomSheetDrawerPaperSx,
  SwipeDismissBottomSheetContent,
} from 'src/components/sheet-shell';

import MapSheetSortMenu from 'src/sections/map/map-sheet-sort-menu';

// ----------------------------------------------------------------------

const MAP_TAG_FILTER_SHEET_TITLE_ID = 'map-tag-filter-sheet-title';

/**
 * Deliberately the same treatment as `discoverFeedChipSx` in `discover-view.js`: open-now is
 * one filter the user meets on two surfaces, and it should not look like two different
 * features. Kept local rather than shared because Discover's version is coupled to its
 * scrollable chip row; if a third surface needs it, promote it to the shared catalog then.
 */
function mapFilterChipSx(theme, selected) {
  return {
    flexShrink: 0,
    alignSelf: 'center',
    height: { xs: 36, sm: 32 },
    minHeight: { xs: 36, sm: 32 },
    borderRadius: RADIUS.pill,
    px: 1.5,
    py: 0,
    textTransform: 'none',
    bgcolor: selected ? 'primary.main' : 'transparent',
    border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
    color: selected ? theme.palette.primary.contrastText : 'text.secondary',
    '& .MuiButton-startIcon': { marginRight: '5px', marginLeft: 0 },
    '&:hover': selected ? { bgcolor: 'primary.dark', borderColor: 'primary.dark' } : undefined,
  };
}

export default function MapTagFilterSheet({
  open,
  onClose,
  tagSections,
  selectedSlugs,
  onSelectedSlugsChange,
  minRating,
  onMinRatingChange,
  sortMode,
  onSortModeChange,
  openNow = false,
  onOpenNowChange,
  loading = false,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const skeletonTheme = useSkeletonThemeColors();

  const slugSetByCategory = useMemo(
    () =>
      tagSections.reduce((map, { category, tags }) => {
        map.set(category, new Set(tags.map((tag) => tag.slug)));
        return map;
      }, new Map()),
    [tagSections]
  );

  const handleCategoryChange = useCallback(
    (category, newOptions) => {
      const inCat = slugSetByCategory.get(category);
      if (!inCat) {
        return;
      }
      onSelectedSlugsChange((prev) => {
        const kept = prev.filter((s) => !inCat.has(s));
        return [...kept, ...newOptions.map((tag) => tag.slug)];
      });
    },
    [onSelectedSlugsChange, slugSetByCategory]
  );

  const handleClearAll = useCallback(() => {
    onSelectedSlugsChange([]);
    onMinRatingChange(0);
    // Distance is the default sort, so "Clear all" returns to it rather than relevance.
    onSortModeChange('distance');
    onOpenNowChange?.(false);
  }, [onSelectedSlugsChange, onMinRatingChange, onSortModeChange, onOpenNowChange]);

  const closeBtn = <SheetCloseIconButton onClick={onClose} />;

  const sheetTitle = (
    <Typography
      id={MAP_TAG_FILTER_SHEET_TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pages.dashboard.map.filter_sheet_title')}
    </Typography>
  );
  // Distance is the default sort, so it isn't an "active" filter; only a switch to relevance is.
  const hasActiveFilters =
    selectedSlugs.length > 0 || minRating > 0 || sortMode === 'relevance' || openNow;

  const clearFiltersOutlineColor =
    theme.palette.mode === 'light' ? theme.palette.common.black : theme.palette.grey[300];

  const bodyInner = (
    <Stack spacing={2.25} sx={{ pt: 0.5 }}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: '1 1 auto', minWidth: 0 }}>
            {t('pages.dashboard.map.filter_sheet_sort')}
          </Typography>
          <MapSheetSortMenu sortMode={sortMode} onSortModeChange={onSortModeChange} />
        </Stack>
        {sortMode === 'distance' ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 1, lineHeight: 1.4 }}
          >
            {t('pages.dashboard.map.filter_sheet_sort_distance_hint')}
          </Typography>
        ) : null}
      </Box>

      {/*
        Open now. Unlike every other filter in this sheet this one is evaluated in SQL —
        `hours_parsed` is stripped from map rows before they reach the client, so there is
        nothing here to filter on. Restaurants whose hours could not be parsed stay visible;
        see restaurant_is_open_at.
      */}
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, flex: '1 1 auto', minWidth: 0 }}>
            {t('pages.dashboard.map.filter_sheet_open_now')}
          </Typography>
          <Button
            onClick={() => onOpenNowChange?.(!openNow)}
            aria-pressed={openNow}
            size="small"
            startIcon={<Iconify icon={ic.clockCircleBold} width={15} />}
            sx={mapFilterChipSx(theme, openNow)}
          >
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              {openNow
                ? t('pages.dashboard.map.filter_sheet_open_now_on')
                : t('pages.dashboard.map.filter_sheet_open_now_off')}
            </Typography>
          </Button>
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1, lineHeight: 1.4 }}
        >
          {t('pages.dashboard.map.filter_sheet_open_now_hint')}
        </Typography>
      </Box>

      {hasActiveFilters ? (
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleClearAll}
          sx={{
            ...mobileStretchButtonSx,
            alignSelf: { xs: 'stretch', sm: 'flex-end' },
            px: 1.5,
            py: 0.5,
            minWidth: 0,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor: clearFiltersOutlineColor,
            color: 'text.primary',
            ...hoverable({
              borderWidth: 1,
              borderColor: clearFiltersOutlineColor,
              bgcolor: 'action.hover',
            }),
          }}
        >
          {t('pages.dashboard.map.filter_sheet_clear')}
        </Button>
      ) : null}

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
          {t('pages.dashboard.map.filter_sheet_min_rating')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t('pages.dashboard.map.filter_sheet_min_rating_hint')}
        </Typography>
        <Slider
          value={minRating}
          onChange={(_, v) => onMinRatingChange(v)}
          min={0}
          max={5}
          step={0.5}
          marks={[
            { value: 0, label: t('pages.dashboard.map.filter_sheet_min_rating_any') },
            { value: 5, label: '5' },
          ]}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) =>
            v === 0 ? t('pages.dashboard.map.filter_sheet_min_rating_any') : String(v)
          }
          aria-valuemin={0}
          aria-valuemax={5}
          getAriaValueText={(v) =>
            v === 0 ? t('pages.dashboard.map.filter_sheet_min_rating_any') : String(v)
          }
          sx={{
            maxWidth: 1,
            '& .MuiSlider-markLabel': {
              fontSize: { xs: '0.6875rem', sm: '0.75rem' },
              whiteSpace: { xs: 'normal', sm: 'nowrap' },
              textAlign: 'center',
              maxWidth: { xs: 72, sm: 'none' },
              lineHeight: 1.2,
            },
          }}
        />
      </Box>

      {loading && tagSections.length === 0 ? (
        <SkeletonTheme
          baseColor={skeletonTheme.baseColor}
          highlightColor={skeletonTheme.highlightColor}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={`filter-skel-${i}`} sx={{ mb: 1 }} aria-busy="true">
              <Skeleton
                width={120}
                height={20}
                borderRadius={RADIUS.tight}
                style={{ marginBottom: 6 }}
              />
              <Skeleton height={56} borderRadius={RADIUS.base} />
            </Box>
          ))}
        </SkeletonTheme>
      ) : null}

      {!loading &&
        tagSections.map(({ category, tags }) => {
          const sectionLabel = t(
            RESTAURANT_TAG_SECTION_I18N[category] ?? RESTAURANT_TAG_SECTION_I18N.other
          );
          const value = tags.filter((tag) => selectedSlugs.includes(tag.slug));
          return (
            <Autocomplete
              key={category}
              multiple
              disablePortal={isMobile}
              options={tags}
              value={value}
              onChange={(_, newVal) => handleCategoryChange(category, newVal)}
              getOptionLabel={(option) => getRestaurantTagDisplayLabel(option, t)}
              isOptionEqualToValue={(a, b) => a.slug === b.slug}
              filterSelectedOptions={false}
              disableCloseOnSelect
              slotProps={{
                popper: {
                  sx: (th) => ({ zIndex: th.zIndex.modal + 2 }),
                  placement: 'bottom-start',
                },
                listbox: {
                  sx: {
                    maxHeight: isMobile ? 'min(40dvh, 280px)' : 320,
                  },
                },
              }}
              renderOption={(liProps, option, { selected }) => {
                const { key, style, ...optionProps } = liProps;
                return (
                  <Box
                    key={key}
                    component="li"
                    {...optionProps}
                    style={{ display: 'flex', alignItems: 'center', ...style }}
                  >
                    <Checkbox
                      size="small"
                      checked={selected}
                      sx={{ mr: 1, p: 0.25 }}
                      tabIndex={-1}
                      disableRipple
                    />
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ fontWeight: selected ? 800 : 500, flex: 1, minWidth: 0 }}
                    >
                      {getRestaurantTagDisplayLabel(option, t)}
                    </Typography>
                  </Box>
                );
              }}
              renderTags={(tagVal, getTagProps) =>
                tagVal.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.slug}
                    label={getRestaurantTagDisplayLabel(option, t)}
                    size="small"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={sectionLabel}
                  placeholder={t('pages.dashboard.map.filter_autocomplete_placeholder')}
                  inputProps={{
                    ...params.inputProps,
                    style: {
                      ...params.inputProps?.style,
                      fontSize: '16px',
                    },
                  }}
                />
              )}
            />
          );
        })}

      {!loading && tagSections.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('pages.dashboard.map.filter_sheet_empty')}
        </Typography>
      ) : null}
    </Stack>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          anchor="bottom"
          elevation={0}
          open={open}
          onClose={onClose}
          aria-labelledby={MAP_TAG_FILTER_SHEET_TITLE_ID}
          PaperProps={{
            sx: mobileBottomSheetDrawerPaperSx,
          }}
        >
          <SwipeDismissBottomSheetContent
            onClose={onClose}
            chrome={
              <>
                <Box {...sheetDragHandleProps()}>
                  <SheetGrabBarRail />
                </Box>
                <SheetHeaderRow title={sheetTitle} endAction={closeBtn} />
              </>
            }
          >
            <Box
              sx={{
                px: 2,
                pb: 'max(16px, calc(16px + env(safe-area-inset-bottom, 0px)))',
              }}
            >
              {bodyInner}
            </Box>
          </SwipeDismissBottomSheetContent>
        </Drawer>
      ) : (
        <Dialog
          open={open}
          onClose={onClose}
          maxWidth="sm"
          fullWidth
          aria-labelledby={MAP_TAG_FILTER_SHEET_TITLE_ID}
          sx={{ '& .MuiDialog-paper': desktopSheetDialogPaperSx }}
        >
          <SheetHeaderRow
            title={sheetTitle}
            endAction={closeBtn}
            sx={{ flexShrink: 0, px: 3, pt: 2.5, pb: 1 }}
          />
          <Box sx={[sheetBodyScrollSx, { px: 3, pb: 3 }]}>{bodyInner}</Box>
        </Dialog>
      )}
    </>
  );
}

MapTagFilterSheet.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  minRating: PropTypes.number.isRequired,
  onMinRatingChange: PropTypes.func.isRequired,
  sortMode: PropTypes.oneOf(['relevance', 'distance']).isRequired,
  onSortModeChange: PropTypes.func.isRequired,
  openNow: PropTypes.bool,
  onOpenNowChange: PropTypes.func,
  tagSections: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string.isRequired,
      tags: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          slug: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
        })
      ).isRequired,
    })
  ),
  selectedSlugs: PropTypes.arrayOf(PropTypes.string),
  onSelectedSlugsChange: PropTypes.func,
  loading: PropTypes.bool,
};

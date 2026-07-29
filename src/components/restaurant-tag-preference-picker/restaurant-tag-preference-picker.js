'use client';

import PropTypes from 'prop-types';
import { useMemo, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import ListSubheader from '@mui/material/ListSubheader';
import useMediaQuery from '@mui/material/useMediaQuery';

import {
  RESTAURANT_TAG_SECTION_I18N,
  getRestaurantTagDisplayLabel,
} from 'src/utils/restaurant-tag-groups';

import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

function normTagId(id) {
  if (id == null || id === '') return '';
  return String(id).trim().toLowerCase();
}

const DISH_GROUP_MINE = '0';
const DISH_GROUP_ALL = '1';

/** MUI Autocomplete `groupBy` requires options sorted by group key. */
function sortDishTagsForGroupBy(tags, userDishTagIds) {
  const mine = tags.filter((tag) => userDishTagIds.has(normTagId(tag.id)));
  const all = tags.filter((tag) => !userDishTagIds.has(normTagId(tag.id)));
  return [...mine, ...all];
}

/**
 * Same multi-select pattern as the map tag filter sheet: Autocomplete + Chip tags per category.
 * Dropdown options use checkboxes (onboarding-style). Use `selection="slugs"` for Discover/map-style slug state.
 *
 * @param {(updater: (prev: Set<string>) => Set<string>) => void} [onSelectedIdsChange]
 * @param {(next: string[]) => void} [onSelectedSlugsChange]
 */
export default function RestaurantTagPreferencePicker({
  tagSections,
  selectedIds,
  onSelectedIdsChange,
  selectedSlugs,
  onSelectedSlugsChange,
  selection = 'ids',
  emptyMessage,
  userDishTagIds,
  disablePortal,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslate();
  const slugMode = selection === 'slugs';
  // Inside a modal (Drawer/Dialog) the popper must stay in the modal's DOM, so
  // callers there leave `disablePortal` unset and it falls back to `isMobile`.
  // Inline callers (e.g. onboarding, with a sibling sticky CTA) pass `false` so
  // the popper portals to <body> and its zIndex can overlay the CTA footer.
  const portalDisabled = disablePortal ?? isMobile;

  const idSetByCategory = useMemo(
    () =>
      tagSections.reduce((map, { category, tags }) => {
        map.set(category, new Set(tags.map((tag) => normTagId(tag.id)).filter(Boolean)));
        return map;
      }, new Map()),
    [tagSections]
  );

  const slugSetByCategory = useMemo(
    () =>
      tagSections.reduce((map, { category, tags }) => {
        map.set(
          category,
          new Set(tags.map((tag) => String(tag.slug ?? '').trim()).filter(Boolean))
        );
        return map;
      }, new Map()),
    [tagSections]
  );

  const handleCategoryChange = useCallback(
    (category, newOptions) => {
      if (slugMode) {
        const inCat = slugSetByCategory.get(category);
        if (!inCat || typeof onSelectedSlugsChange !== 'function') {
          return;
        }
        const prev = Array.isArray(selectedSlugs) ? selectedSlugs : [];
        const kept = prev.filter((s) => !inCat.has(s));
        onSelectedSlugsChange([...kept, ...newOptions.map((tag) => tag.slug)]);
        return;
      }
      const inCat = idSetByCategory.get(category);
      if (!inCat) {
        return;
      }
      onSelectedIdsChange((prev) => {
        const next = new Set(prev);
        inCat.forEach((id) => {
          next.delete(id);
        });
        newOptions.forEach((tag) => {
          const nid = normTagId(tag.id);
          if (nid) next.add(nid);
        });
        return next;
      });
    },
    [
      slugMode,
      slugSetByCategory,
      idSetByCategory,
      onSelectedIdsChange,
      onSelectedSlugsChange,
      selectedSlugs,
    ]
  );

  const userHasDishTags = Boolean(userDishTagIds?.size);

  if (!tagSections?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Stack spacing={2.25}>
      {tagSections.map(({ category, tags }) => {
        const sectionLabel = t(
          RESTAURANT_TAG_SECTION_I18N[category] ?? RESTAURANT_TAG_SECTION_I18N.other
        );
        const idSet = selectedIds ?? new Set();
        const value = slugMode
          ? tags.filter((tag) =>
              (Array.isArray(selectedSlugs) ? selectedSlugs : []).includes(tag.slug)
            )
          : tags.filter((tag) => idSet.has(normTagId(tag.id)));
        const showDishGrouping =
          category === 'dish' &&
          userHasDishTags &&
          tags.some((tag) => !userDishTagIds.has(normTagId(tag.id)));
        const dishGroupBy = showDishGrouping
          ? (option) =>
              userDishTagIds.has(normTagId(option.id)) ? DISH_GROUP_MINE : DISH_GROUP_ALL
          : undefined;
        const options = showDishGrouping ? sortDishTagsForGroupBy(tags, userDishTagIds) : tags;
        return (
          <Autocomplete
            key={category}
            multiple
            disablePortal={portalDisabled}
            options={options}
            value={value}
            onChange={(_, newVal) => handleCategoryChange(category, newVal)}
            groupBy={dishGroupBy}
            renderGroup={
              dishGroupBy
                ? (params) => (
                    <li key={params.key}>
                      <ListSubheader component="div" sx={{ fontWeight: 800, lineHeight: 2 }}>
                        {params.group === DISH_GROUP_MINE
                          ? t('pages.dashboard.tag_filters.dish_group_mine')
                          : t('pages.dashboard.tag_filters.dish_group_all')}
                      </ListSubheader>
                      <ul style={{ padding: 0 }}>{params.children}</ul>
                    </li>
                  )
                : undefined
            }
            getOptionLabel={(option) => getRestaurantTagDisplayLabel(option, t)}
            isOptionEqualToValue={(a, b) =>
              slugMode ? a.slug === b.slug : normTagId(a.id) === normTagId(b.id)
            }
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
                  key={slugMode ? option.slug : option.id}
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
    </Stack>
  );
}

RestaurantTagPreferencePicker.propTypes = {
  tagSections: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string.isRequired,
      tags: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          slug: PropTypes.string.isRequired,
          label: PropTypes.string.isRequired,
          category: PropTypes.string,
          sort_order: PropTypes.number,
        })
      ).isRequired,
    })
  ).isRequired,
  selection: PropTypes.oneOf(['ids', 'slugs']),
  selectedIds: PropTypes.instanceOf(Set),
  onSelectedIdsChange: PropTypes.func,
  selectedSlugs: PropTypes.arrayOf(PropTypes.string),
  onSelectedSlugsChange: PropTypes.func,
  emptyMessage: PropTypes.string.isRequired,
  userDishTagIds: PropTypes.instanceOf(Set),
  disablePortal: PropTypes.bool,
};

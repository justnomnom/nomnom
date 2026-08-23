'use client';

import PropTypes from 'prop-types';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { tablePlaceToSheetRestaurant } from 'src/libs/lists/table-client';
import { fetchRestaurantDetail } from 'src/libs/restaurant/fetch-restaurant-detail-action';

import {
  SheetGrabBarRail,
  sheetBodyScrollSx,
  sheetDragHandleProps,
  desktopSheetDialogPaperSx,
  mobileBottomSheetDrawerPaperSx,
  SwipeDismissBottomSheetContent,
} from 'src/components/sheet-shell';

import RestaurantPublicAuthPrompt from 'src/sections/restaurant/restaurant-public-auth-prompt';
import {
  RestaurantDetailViewMapSheet,
  RestaurantDetailViewMapSheetLoading,
} from 'src/sections/map/map-restaurant-detail-view';

// ----------------------------------------------------------------------

const SHEET_HEIGHT_SX = {
  height: 'min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px)))',
};

/**
 * Bottom sheet (mobile) / dialog (desktop) with the restaurant detail page.
 * Opens on a Table place row so voters can read photos, hours, tags, and maps
 * without leaving the vote.
 * @param {{ open: boolean, onClose: () => void, place: object | null }} props
 */
export default function TableRestaurantDetailSheet({ open, onClose, place }) {
  const { t } = useTranslate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { authenticated } = useAuthContext();
  const cacheRef = useRef(/** @type {Map<string, object>} */ (new Map()));
  const [restaurant, setRestaurant] = useState(/** @type {object | null} */ (null));
  const [loadError, setLoadError] = useState(/** @type {string | null} */ (null));
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const restaurantId = place?.restaurantId ? String(place.restaurantId) : '';
  const sheetTitle = place?.name || t('pages.table.unnamed_place');

  useEffect(() => {
    if (!open || !restaurantId) {
      setLoadError(null);
      return undefined;
    }
    const cached = cacheRef.current.get(restaurantId);
    setRestaurant(cached || tablePlaceToSheetRestaurant(place));
    if (cached) {
      setLoadError(null);
      return undefined;
    }
    let cancelled = false;
    fetchRestaurantDetail(restaurantId).then(({ restaurant: next, error }) => {
      if (cancelled) return;
      if (!next) {
        setLoadError(error || 'not_found');
        return;
      }
      cacheRef.current.set(restaurantId, next);
      setRestaurant(next);
      setLoadError(null);
    });
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId, place]);

  const handleGuestSaveClick = useCallback(() => setAuthPromptOpen(true), []);
  const handleAuthPromptClose = useCallback(() => setAuthPromptOpen(false), []);

  const body = (() => {
    if (!restaurant) {
      if (loadError) {
        return (
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="body2" color="error">
              {t('pages.table.place_details_error')}
            </Typography>
          </Box>
        );
      }
      return <RestaurantDetailViewMapSheetLoading />;
    }
    return (
      <RestaurantDetailViewMapSheet
        key={String(restaurant.id)}
        mapSheetMode
        restaurant={restaurant}
        onClose={onClose}
        showListsAndReviews={false}
        onGuestSaveClick={authenticated ? null : handleGuestSaveClick}
      />
    );
  })();

  const sheet = isMobile ? (
    <Drawer
      anchor="bottom"
      elevation={0}
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      aria-label={sheetTitle}
      PaperProps={{
        sx: mobileBottomSheetDrawerPaperSx,
        role: 'dialog',
        'aria-modal': true,
        'aria-label': sheetTitle,
      }}
    >
      <SwipeDismissBottomSheetContent
        onClose={onClose}
        sx={SHEET_HEIGHT_SX}
        chrome={
          <Box {...sheetDragHandleProps()}>
            <SheetGrabBarRail />
          </Box>
        }
      >
        {body}
      </SwipeDismissBottomSheetContent>
    </Drawer>
  ) : (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={onClose}
      keepMounted={false}
      aria-label={sheetTitle}
      sx={{ '& .MuiDialog-paper': { ...desktopSheetDialogPaperSx, p: 0 } }}
    >
      <Box sx={sheetBodyScrollSx}>{body}</Box>
    </Dialog>
  );

  return (
    <>
      {sheet}
      {restaurantId ? (
        <RestaurantPublicAuthPrompt
          restaurantId={restaurantId}
          open={authPromptOpen}
          onClose={handleAuthPromptClose}
          autoOpen={false}
        />
      ) : null}
    </>
  );
}

TableRestaurantDetailSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  place: PropTypes.object,
};

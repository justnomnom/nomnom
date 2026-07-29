import PropTypes from 'prop-types';
import {
  ScaleControl,
  GeolocateControl,
  NavigationControl,
  FullscreenControl,
} from 'react-map-gl/mapbox';

import { StyledMapControls } from './styles';

// ----------------------------------------------------------------------

export default function MapControl({
  hideScaleControl,
  hideGeolocateControl,
  hideFullscreenControl,
  hideNavigationnControl,
  geolocateControlRef = null,
  onGeolocate = null,
  onGeolocateError = null,
}) {
  return (
    <>
      <StyledMapControls />

      {!hideGeolocateControl && (
        <GeolocateControl
          ref={geolocateControlRef}
          position="top-right"
          /**
           * Passing `positionOptions` REPLACES Mapbox's defaults (which include `timeout: 6000`).
           * The old `{ enableHighAccuracy: true }` dropped that timeout, so on desktop the
           * high-accuracy GPS request would hang and never resolve — the button spins and the
           * map never moves. Standard accuracy resolves reliably on desktop+mobile (≈100m is
           * plenty for "restaurants near me"), with an explicit timeout + short cache so a
           * second tap is instant.
           */
          positionOptions={{ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }}
          trackUserLocation={false}
          onGeolocate={onGeolocate ?? undefined}
          onError={onGeolocateError ?? undefined}
        />
      )}

      {!hideFullscreenControl && <FullscreenControl position="top-right" />}

      {!hideScaleControl && <ScaleControl position="bottom-left" />}

      {!hideNavigationnControl && <NavigationControl position="top-right" />}
    </>
  );
}

MapControl.propTypes = {
  hideFullscreenControl: PropTypes.bool,
  hideGeolocateControl: PropTypes.bool,
  hideNavigationnControl: PropTypes.bool,
  hideScaleControl: PropTypes.bool,
  geolocateControlRef: PropTypes.shape({ current: PropTypes.object }),
  onGeolocate: PropTypes.func,
  onGeolocateError: PropTypes.func,
};

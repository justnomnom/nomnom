/**
 * Spread onto MUI Modal/Popover/Dialog/Menu when portaling into fullscreen.
 * Never sets `container` to `undefined` (invalid in MUI 7+ / Popper); omits on SSR.
 *
 * @param {boolean} isFullscreen
 * @returns {{ container?: HTMLElement }}
 */
export function muiFullscreenPortalContainerProps(isFullscreen) {
  if (typeof document === 'undefined') {
    return {};
  }
  return {
    container: (isFullscreen && document.fullscreenElement) || document.body,
  };
}

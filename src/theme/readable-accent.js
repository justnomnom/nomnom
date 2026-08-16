/**
 * Terracotta that stays readable as small text or as a state indicator.
 *
 * `primary.main` (#FF6B35) is only AA for *large* text on light surfaces
 * (DESIGN.md §19) — it measures 2.6:1 on the dashboard card surface, so small
 * labels and small indicator glyphs painted with it fail both AA (4.5:1) and
 * the non-text contrast floor (3:1). Light mode therefore steps down to
 * `primary.darker` (4.8:1 on card, 5.1:1 on paper); dark mode keeps
 * `primary.main`, which already measures 5.7:1 on `background.paper`.
 *
 * Use for: accent-colored counts, unread dots, small type glyphs.
 * Do NOT use for filled brand surfaces (contained buttons, selected chips) —
 * those keep `primary.main` with `contrastText`.
 *
 * @param {import('@mui/material/styles').Theme} theme
 * @returns {string}
 */
export function readableAccent(theme) {
  return theme.palette.mode === 'dark'
    ? theme.palette.primary.main
    : theme.palette.primary.darker;
}

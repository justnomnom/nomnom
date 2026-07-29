/**
 * Scope `:hover` paint to environments with real hover + fine pointer (mouse/trackpad).
 * Avoids sticky “still pressed / highlighted” after tap on phones and many touch hybrids,
 * including devices that incorrectly report `(hover: hover)` while using a coarse pointer.
 */
export function hoverable(hoverStyles) {
  return {
    '@media (hover: hover) and (pointer: fine)': {
      '&:hover': hoverStyles,
    },
  };
}

/**
 * Same media gate as {@link hoverable}, for nested selectors (e.g. `&:hover::after`).
 */
export function finePointerHover(nestedStyles) {
  return {
    '@media (hover: hover) and (pointer: fine)': nestedStyles,
  };
}

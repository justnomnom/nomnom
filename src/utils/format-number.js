// ----------------------------------------------------------------------

/*
 * Locales code
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */

export function getLocaleCode(currentLang) {
  return {
    code: currentLang?.numberFormat?.code ?? 'en-US',
    currency: currentLang?.numberFormat?.currency ?? 'USD',
  };
}

// ----------------------------------------------------------------------

export function fNumber(inputValue, currentLang) {
  const { code } = getLocaleCode(currentLang);
  if (inputValue === 0) return '0';
  if (!inputValue) return '';
  const number = Number(inputValue);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(code, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

// ----------------------------------------------------------------------

/**
 * Star rating for display: one decimal, locale-aware separator ("4.5" / "4,5").
 * `trimTrailingZero` drops the decimal on whole numbers ("5" instead of "5.0").
 */
export function fRating(inputValue, currentLang, { trimTrailingZero = false } = {}) {
  // Avoid Number(null) === 0 and Number('') === 0 looking like a real rating.
  if (inputValue === null || inputValue === undefined || inputValue === '') return '';
  const number = Number(inputValue);
  if (!Number.isFinite(number)) return '';
  const { code } = getLocaleCode(currentLang);
  return new Intl.NumberFormat(code, {
    minimumFractionDigits: trimTrailingZero && Number.isInteger(number) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(number);
}

// ----------------------------------------------------------------------

export function fCurrency(inputValue, currentLang) {
  const { code, currency } = getLocaleCode(currentLang);
  if (inputValue === 0) return '0';
  if (!inputValue) return '';
  const number = Number(inputValue);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(code, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

// ----------------------------------------------------------------------

export function fPercent(inputValue, currentLang) {
  const { code } = getLocaleCode(currentLang);
  if (inputValue === 0) return '0%';
  if (!inputValue) return '';
  const number = Number(inputValue) / 100;
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(code, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(number);
}

// ----------------------------------------------------------------------

export function fShortenNumber(inputValue, currentLang) {
  const { code } = getLocaleCode(currentLang);
  if (inputValue === 0) return '0';
  if (!inputValue) return '';
  const number = Number(inputValue);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(code, {
    notation: 'compact',
    maximumFractionDigits: 2,
  })
    .format(number)
    .replace(/[A-Z]/g, (match) => match.toLowerCase());
}

// ----------------------------------------------------------------------

export function fData(inputValue) {
  if (inputValue === 0) return '0 Bytes';
  if (!inputValue) return '';
  const units = ['bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
  const decimal = 2;
  const baseValue = 1024;
  const number = Number(inputValue);
  if (!Number.isFinite(number) || number < 0) return '';
  const index = Math.min(
    Math.max(0, Math.floor(Math.log(number) / Math.log(baseValue))),
    units.length - 1
  );
  return `${parseFloat((number / baseValue ** index).toFixed(decimal))} ${units[index]}`;
}

import enTranslations from './langs/en.json';

export const getDefaultTranslation = (key) => {
  const keys = key.split('.');
  return keys.reduce((value, k) => {
    if (value && typeof value === 'object') {
      return value[k];
    }
    return undefined;
  }, enTranslations);
};

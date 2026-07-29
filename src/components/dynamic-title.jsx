'use client';

import { useEffect } from 'react';
import PropTypes from 'prop-types';

import { useTranslate } from 'src/locales';

export function DynamicTitle({ titleKey, titleValues = undefined }) {
  const { t } = useTranslate();

  useEffect(() => {
    try {
      if (titleKey && typeof t === 'function') {
        const translatedTitle = titleValues ? t(titleKey, titleValues) : t(titleKey);
        if (translatedTitle) {
          document.title = translatedTitle;
        }
      }
    } catch (error) {
      console.error('Error setting dynamic title:', error);
    }
  }, [titleKey, titleValues, t]);

  return null;
}

DynamicTitle.propTypes = {
  titleKey: PropTypes.string.isRequired,
  titleValues: PropTypes.object,
};

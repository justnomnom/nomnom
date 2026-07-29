import PropTypes from 'prop-types';

import Box from '@mui/material/Box';

import { useTranslate } from 'src/locales/use-locales';

import Image from '../image';

// ----------------------------------------------------------------------

export default function SingleFilePreview({ imgUrl = '' }) {
  const { t } = useTranslate();

  return (
    <Box
      sx={{
        p: 1,
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        position: 'absolute',
      }}
    >
      <Image
        alt={t('components.upload.file_preview')}
        src={imgUrl}
        sx={{
          width: 1,
          height: 1,
          borderRadius: 1,
        }}
      />
    </Box>
  );
}

SingleFilePreview.propTypes = {
  imgUrl: PropTypes.string,
};

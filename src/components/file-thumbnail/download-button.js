import PropTypes from 'prop-types';

import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { ic } from 'src/assets/icons';
import { bgBlur } from 'src/theme/css';
import { useTranslate } from 'src/locales';

import Iconify from '../iconify';

// ----------------------------------------------------------------------

export default function DownloadButton({ onDownload }) {
  const theme = useTheme();

  const { t } = useTranslate();

  return (
    <IconButton
      onClick={onDownload}
      aria-label={t('common.a11y.download')}
      sx={{
        p: 0,
        top: 0,
        right: 0,
        width: 1,
        height: 1,
        zIndex: 9,
        opacity: 0,
        position: 'absolute',
        borderRadius: 'unset',
        justifyContent: 'center',
        bgcolor: 'grey.800',
        color: 'common.white',
        transition: theme.transitions.create(['opacity']),
        WebkitTapHighlightColor: 'transparent',

        '&:hover': {
          opacity: 1,
          ...bgBlur({
            opacity: 0.64,
            color: theme.palette.grey[900],
          }),
        },
        '@media (hover: none)': {
          opacity: 0.72,
        },
        '&:active': {
          opacity: 1,
        },
      }}
    >
      <Iconify icon={ic.arrowCircleDownFill} width={24} />
    </IconButton>
  );
}

DownloadButton.propTypes = {
  onDownload: PropTypes.func,
};

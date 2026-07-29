import PropTypes from 'prop-types';
import { m, AnimatePresence } from 'framer-motion';

import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { fData } from 'src/utils/format-number';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { touchTargetSx } from 'src/theme/spacing';

import Iconify from '../iconify';
import { varFade } from '../animate';
import FileThumbnail, { fileData } from '../file-thumbnail';

// ----------------------------------------------------------------------

export default function MultiFilePreview({ thumbnail, files, onRemove, sx }) {
  const { t } = useTranslate();

  return (
    <AnimatePresence initial={false}>
      {files?.map((file) => {
        const { key, name = '', size = 0 } = fileData(file);

        const isNotFormatFile = typeof file === 'string';

        if (thumbnail) {
          return (
            <Stack
              key={key}
              component={m.div}
              {...varFade().inUp}
              alignItems="center"
              display="inline-flex"
              justifyContent="center"
              sx={{
                m: 0.5,
                width: 80,
                height: 80,
                borderRadius: 1.25,
                overflow: 'hidden',
                position: 'relative',
                border: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.16)}`,
                ...sx,
              }}
            >
              <FileThumbnail
                tooltip
                imageView
                file={file}
                sx={{ position: 'absolute' }}
                imgSx={{ position: 'absolute' }}
              />

              {onRemove && (
                <IconButton
                  onClick={() => onRemove(file)}
                  aria-label={t('common.a11y.remove')}
                  sx={{
                    top: 0,
                    right: 0,
                    position: 'absolute',
                    ...touchTargetSx,
                    color: 'common.white',
                    bgcolor: (theme) => alpha(theme.palette.grey[900], 0.48),
                    WebkitTapHighlightColor: 'transparent',
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.grey[900], 0.72),
                    },
                    '&:active': {
                      bgcolor: (theme) => alpha(theme.palette.grey[900], 0.85),
                    },
                  }}
                >
                  <Iconify icon={ic.closeLine} width={18} />
                </IconButton>
              )}
            </Stack>
          );
        }

        return (
          <Stack
            key={key}
            component={m.div}
            {...varFade().inUp}
            spacing={2}
            direction="row"
            alignItems="center"
            sx={{
              my: 1,
              py: 1,
              px: 1.5,
              borderRadius: 1,
              border: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.16)}`,
              ...sx,
            }}
          >
            <FileThumbnail file={file} />

            <ListItemText
              primary={isNotFormatFile ? file : name}
              secondary={isNotFormatFile ? '' : fData(size)}
              secondaryTypographyProps={{
                component: 'span',
                typography: 'caption',
              }}
            />

            {onRemove && (
              <IconButton
                onClick={() => onRemove(file)}
                aria-label={t('common.a11y.remove')}
                sx={{
                  ...touchTargetSx,
                  WebkitTapHighlightColor: 'transparent',
                  '&:active': { bgcolor: 'action.hover' },
                }}
              >
                <Iconify icon={ic.closeLine} width={18} />
              </IconButton>
            )}
          </Stack>
        );
      })}
    </AnimatePresence>
  );
}

MultiFilePreview.propTypes = {
  files: PropTypes.array,
  onRemove: PropTypes.func,
  sx: PropTypes.object,
  thumbnail: PropTypes.bool,
};

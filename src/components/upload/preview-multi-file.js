import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { fData } from 'src/utils/format-number';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { touchTargetSx } from 'src/theme/spacing';

import { m, varFade, AnimatePresence } from 'src/components/animate';

import Iconify from '../iconify';
import FileThumbnail, { fileData } from '../file-thumbnail';

// ----------------------------------------------------------------------

export default function MultiFilePreview({ thumbnail, files, onRemove, sx }) {
  const { t } = useTranslate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const fadeProps = prefersReducedMotion ? {} : varFade().inUp;

  return (
    <AnimatePresence initial={false}>
      {files?.map((file) => {
        const { key, name = '', size = 0 } = fileData(file);

        const isNotFormatFile = typeof file === 'string';

        if (thumbnail) {
          return (
            <Stack
              key={key}
              component={prefersReducedMotion ? 'div' : m.div}
              {...fadeProps}
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
            component={prefersReducedMotion ? 'div' : m.div}
            {...fadeProps}
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

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { svgIcon } from 'src/assets/icons';
import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

export default function EmptyContent({ title, imgUrl, action, filled, description, sx, ...other }) {
  const { t } = useTranslate();

  return (
    <Stack
      flexGrow={1}
      alignItems="center"
      justifyContent="center"
      sx={{
        px: 3,
        py: 4,
        height: 1,
        ...(filled && {
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === 'light'
              ? alpha(theme.palette.marketing?.parchmentDeep ?? theme.palette.grey[200], 0.5)
              : alpha(theme.palette.grey[500], 0.06),
          border: (theme) =>
            `1px solid ${
              theme.palette.mode === 'light'
                ? (theme.palette.marketing?.dividerWarm ?? theme.palette.grey[300])
                : theme.palette.divider
            }`,
        }),
        ...sx,
      }}
      {...other}
    >
      <Box
        sx={{
          width: 1,
          maxWidth: 160,
          '@media (prefers-reduced-motion: no-preference)': {
            animation: 'empty-content-float 6s ease-in-out infinite',
          },
          '@keyframes empty-content-float': {
            '0%, 100%': { transform: 'translateY(0)' },
            '50%': { transform: 'translateY(-4px)' },
          },
        }}
      >
        <Box
          component="img"
          alt={t('components.empty_content.alt_text')}
          src={imgUrl || svgIcon.emptyContent}
          sx={{
            width: 1,
            opacity: 0.9,
            filter: (theme) =>
              theme.palette.mode === 'light' ? 'saturate(1.05)' : 'brightness(0.95)',
          }}
        />
      </Box>

      {title && (
        <Typography
          variant="h6"
          component="span"
          sx={{
            mt: 2,
            color: (theme) => (theme.palette.mode === 'light' ? 'text.secondary' : 'text.disabled'),
            textAlign: 'center',
            letterSpacing: 0.1,
          }}
        >
          {title}
        </Typography>
      )}

      {description && (
        <Typography
          variant="body2"
          sx={{
            mt: 0.75,
            color: (theme) =>
              theme.palette.mode === 'light'
                ? alpha(theme.palette.text.primary, 0.62)
                : 'text.disabled',
            textAlign: 'center',
            maxWidth: 360,
          }}
        >
          {description}
        </Typography>
      )}

      {action && action}
    </Stack>
  );
}

EmptyContent.propTypes = {
  action: PropTypes.node,
  description: PropTypes.string,
  filled: PropTypes.bool,
  imgUrl: PropTypes.string,
  sx: PropTypes.object,
  title: PropTypes.string,
};

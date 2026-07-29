'use client';

import PropTypes from 'prop-types';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';

import { useRouter } from 'src/routes/hooks';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales/use-locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import Iconify from 'src/components/iconify';
import SearchNotFound from 'src/components/search-not-found';

// ----------------------------------------------------------------------

export default function PostSearch({ query, results, onSearch, hrefItem, loading }) {
  const { t } = useTranslate();
  const router = useRouter();

  const skeletonTheme = useSkeletonThemeColors();

  const handleClick = (title) => {
    router.push(hrefItem(title));
  };

  const handleKeyUp = (event) => {
    if (query) {
      if (event.key === 'Enter') {
        handleClick(query);
      }
    }
  };

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Autocomplete
        sx={{ width: { xs: 1, sm: 260 } }}
        loading={loading}
        autoHighlight
        popupIcon={null}
        options={results}
        onInputChange={(event, newValue) => onSearch(newValue)}
        getOptionLabel={(option) => option.title}
        noOptionsText={<SearchNotFound query={query} sx={{ bgcolor: 'unset' }} />}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        slotProps={{
          popper: {
            placement: 'bottom-start',
            sx: {
              minWidth: { xs: 0, sm: 320 },
              maxWidth: { xs: 'calc(100vw - 24px)', sm: 'none' },
            },
          },
          paper: {
            sx: {
              [` .${autocompleteClasses.option}`]: {
                pl: 0.75,
              },
            },
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={t('components.empty_content.blog.search.placeholder')}
            onKeyUp={handleKeyUp}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon={ic.searchFill} sx={{ ml: 1, color: 'text.disabled' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}>
                      <Skeleton circle width={22} height={22} />
                    </Box>
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, post, { inputValue }) => {
          const matches = match(post.title, inputValue);
          const parts = parse(post.title, matches);

          return (
            <li {...props} key={post.id}>
              <Avatar
                key={post.id}
                alt={post.title}
                src={post.coverUrl}
                variant="rounded"
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  mr: 1.5,
                  borderRadius: 1,
                }}
              />

              <Link
                key={inputValue}
                underline="none"
                onClick={() => handleClick(post.slug || post.title)}
              >
                {parts.map((part, index) => (
                  <Typography
                    key={index}
                    component="span"
                    color={part.highlight ? 'primary' : 'textPrimary'}
                    sx={{
                      typography: 'body2',
                      fontWeight: part.highlight ? 'fontWeightSemiBold' : 'fontWeightMedium',
                    }}
                  >
                    {part.text}
                  </Typography>
                ))}
              </Link>
            </li>
          );
        }}
      />
    </SkeletonTheme>
  );
}

PostSearch.propTypes = {
  hrefItem: PropTypes.func,
  loading: PropTypes.bool,
  onSearch: PropTypes.func,
  query: PropTypes.string,
  results: PropTypes.array,
};

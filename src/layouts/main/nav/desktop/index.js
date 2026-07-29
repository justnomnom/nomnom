import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';

import NavList from './nav-list';

// ----------------------------------------------------------------------

export default function NavDesktop({ data }) {
  return (
    <Stack
      component="nav"
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={1}
      columnGap={2}
      rowGap={0.5}
      justifyContent="flex-end"
      sx={{
        mr: { md: 2, lg: 4 },
        maxWidth: { md: 'min(100%, 560px)', lg: 'min(100%, 720px)' },
        height: 1,
      }}
    >
      {data.map((list) => (
        <NavList key={list.path} data={list} />
      ))}
    </Stack>
  );
}

NavDesktop.propTypes = {
  data: PropTypes.array,
};

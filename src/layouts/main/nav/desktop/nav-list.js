import PropTypes from 'prop-types';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Popper from '@mui/material/Popper';
import { alpha, useTheme } from '@mui/material/styles';
import ListSubheader from '@mui/material/ListSubheader';

import { usePathname } from 'src/routes/hooks';
import { useActiveLink } from 'src/routes/hooks/use-active-link';

import { paper } from 'src/theme/css';
import { useTranslate } from 'src/locales';

import { NavItem, NavItemDashboard } from './nav-item';

// ----------------------------------------------------------------------

function SubNavLink({ item, siblingPaths }) {
  const active = useActiveLink(item.path, true, siblingPaths);

  return <NavItem title={item.title} path={item.path} active={active} subItem />;
}

SubNavLink.propTypes = {
  item: PropTypes.shape({
    title: PropTypes.string,
    path: PropTypes.string,
  }),
  siblingPaths: PropTypes.arrayOf(PropTypes.string),
};

/** Renders flat or nested nav items with indentation for child levels (Countries → city → …). */
function SubNavTree({ items }) {
  const siblingPaths = items.map((i) => i.path).filter(Boolean);

  return (
    <Stack spacing={1.25} alignItems="flex-start" width={1}>
      {items.map((item) => (
        <Box key={item.path ?? item.title} width={1}>
          <SubNavLink item={item} siblingPaths={siblingPaths} />
          {!!item.children?.length && (
            <Stack
              spacing={1}
              alignItems="flex-start"
              sx={(theme) => ({
                mt: 1,
                pl: 2,
                ml: 0.5,
                borderLeft: `1px solid ${
                  theme.palette.mode === 'light'
                    ? alpha(theme.palette.marketing.dividerWarm, 0.95)
                    : alpha(theme.palette.grey[500], 0.35)
                }`,
              })}
            >
              <SubNavTree items={item.children} />
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}

SubNavTree.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string,
      path: PropTypes.string,
      children: PropTypes.array,
    })
  ),
};

// ----------------------------------------------------------------------

export default function NavList({ data }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const pathname = usePathname();

  const active = useActiveLink(data.path, !!data.children);

  const navItemRef = useRef(null);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    if (openMenu) {
      handleCloseMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleOpenMenu = useCallback(() => {
    if (data.children) {
      setOpenMenu(true);
    }
  }, [data.children]);

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);

  return (
    <>
      <NavItem
        ref={navItemRef}
        open={openMenu}
        onMouseEnter={handleOpenMenu}
        onMouseLeave={handleCloseMenu}
        //
        title={data.translate ? t(data.title) : data.title}
        path={data.path}
        //
        hasChild={!!data.children}
        externalLink={data.path.includes('http')}
        //
        active={active}
      />

      {!!data.children && (
        <Popper
          open={openMenu}
          anchorEl={navItemRef.current}
          placement="bottom-start"
          transition
          disablePortal={false}
          modifiers={[
            { name: 'offset', options: { offset: [0, 8] } },
            {
              name: 'preventOverflow',
              options: { boundary: 'viewport', padding: 8 },
            },
          ]}
          style={{ zIndex: theme.zIndex.modal }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps}>
              <Paper
                onMouseEnter={handleOpenMenu}
                onMouseLeave={handleCloseMenu}
                sx={{
                  ...paper({ theme }),
                  display: 'flex',
                  borderRadius: 1.5,
                  p: 2,
                  width: 'fit-content',
                  maxWidth: theme.breakpoints.values.lg,
                  boxShadow: theme.customShadows.dropdown,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: `1px solid ${
                    theme.palette.mode === 'light'
                      ? alpha(theme.palette.marketing.dividerWarm, 0.98)
                      : alpha(theme.palette.grey[500], 0.45)
                  }`,
                }}
              >
                {data.children.map((list, index) => (
                  <NavSubList
                    key={list.key ?? list.subheader ?? `nav-group-${index}`}
                    subheader={list.subheader}
                    data={list.items}
                  />
                ))}
              </Paper>
            </Fade>
          )}
        </Popper>
      )}
    </>
  );
}

NavList.propTypes = {
  data: PropTypes.shape({
    path: PropTypes.string,
    title: PropTypes.string,
    translate: PropTypes.bool,
    children: PropTypes.array,
  }),
};

// ----------------------------------------------------------------------

function NavSubList({ data, subheader, sx, ...other }) {
  const items = Array.isArray(data) ? data : [];
  const dashboard = subheader === 'Dashboard';

  return (
    <Stack
      spacing={2}
      flexGrow={1}
      alignItems="flex-start"
      sx={{
        pb: 0,
        color: 'text.primary',
        ...(dashboard && {
          maxWidth: { md: 1 / 3, lg: 540 },
        }),
        ...sx,
      }}
      {...other}
    >
      {subheader ? (
        <ListSubheader
          disableSticky
          sx={{
            p: 0,
            typography: 'overline',
            fontSize: 11,
            color: 'text.primary',
          }}
        >
          {subheader}
        </ListSubheader>
      ) : null}

      {dashboard ? (
        items.map((item) => <NavItemDashboard key={item.title} path={item.path} />)
      ) : (
        <SubNavTree items={items} />
      )}
    </Stack>
  );
}

NavSubList.propTypes = {
  data: PropTypes.array,
  subheader: PropTypes.string,
  sx: PropTypes.object,
};

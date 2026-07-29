import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';

import { useActiveLink } from 'src/routes/hooks/use-active-link';

import { NavSectionVertical } from 'src/components/nav-section';

import { NavItem } from './nav-item';

// ----------------------------------------------------------------------

export default function NavList({ data }) {
  const active = useActiveLink(data.path, !!data.children);

  const [openMenu, setOpenMenu] = useState(active);

  useEffect(() => {
    if (active) {
      setOpenMenu(true);
    }
  }, [active]);

  const handleToggleMenu = useCallback(() => {
    if (data.children) {
      setOpenMenu((prev) => !prev);
    }
  }, [data.children]);

  return (
    <>
      <NavItem
        open={openMenu}
        onClick={handleToggleMenu}
        //
        title={data.title}
        path={data.path}
        icon={data.icon}
        //
        hasChild={!!data.children}
        externalLink={data.path.includes('http')}
        //
        active={active}
      />

      {!!data.children && (
        <Collapse in={openMenu} unmountOnExit>
          <Box
            sx={{
              color: 'text.primary',
              '& .component-iconify': { color: 'currentColor' },
            }}
          >
            <NavSectionVertical
              data={data.children}
              slotProps={{
                rootItem: {
                  minHeight: 36,
                },
              }}
            />
          </Box>
        </Collapse>
      )}
    </>
  );
}

NavList.propTypes = {
  data: PropTypes.shape({
    title: PropTypes.string,
    path: PropTypes.string,
    icon: PropTypes.element,
    children: PropTypes.array,
  }),
};

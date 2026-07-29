import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import Collapse from '@mui/material/Collapse';

import { usePathname } from 'src/routes/hooks';
import { useActiveLink } from 'src/routes/hooks/use-active-link';

import NavItem from './nav-item';

// ----------------------------------------------------------------------

export default function NavList({ data, depth = 0, slotProps, siblingPaths }) {
  const pathname = usePathname();

  const active = useActiveLink(data.path, !!data.children || depth >= 1, siblingPaths);

  const [openMenu, setOpenMenu] = useState(active);

  useEffect(() => {
    if (!active) {
      handleCloseMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleToggleMenu = useCallback(() => {
    if (data.children) {
      setOpenMenu((prev) => !prev);
    }
  }, [data.children]);

  const handleCloseMenu = useCallback(() => {
    setOpenMenu(false);
  }, []);

  return (
    <>
      <NavItem
        open={openMenu}
        onClick={handleToggleMenu}
        //
        title={data.title}
        path={data.path}
        icon={data.icon}
        bottomNavIconify={data.bottomNavIconify}
        info={data.info}
        roles={data.roles}
        caption={data.caption}
        disabled={data.disabled}
        //
        depth={depth}
        hasChild={!!data.children}
        externalLink={data.path.includes('http')}
        currentRole={slotProps?.currentRole}
        //
        active={active}
        className={active ? 'active' : ''}
        sx={{
          mb: `${slotProps?.gap}px`,
          ...(depth === 1 ? slotProps?.rootItem : slotProps?.subItem),
        }}
      />

      {!!data.children && (
        <Collapse in={openMenu} unmountOnExit>
          <NavSubList
            data={data.children}
            depth={depth}
            slotProps={slotProps}
            siblingPaths={data.children.map((c) => c.path).filter(Boolean)}
          />
        </Collapse>
      )}
    </>
  );
}

NavList.propTypes = {
  data: PropTypes.object,
  depth: PropTypes.number,
  slotProps: PropTypes.object,
  siblingPaths: PropTypes.arrayOf(PropTypes.string),
};

// ----------------------------------------------------------------------

function NavSubList({ data, depth, slotProps, siblingPaths }) {
  return (
    <>
      {data.map((list) => (
        <NavList
          key={list.path != null ? `${list.path}::${list.title}` : list.title}
          data={list}
          depth={depth + 1}
          slotProps={slotProps}
          siblingPaths={siblingPaths}
        />
      ))}
    </>
  );
}

NavSubList.propTypes = {
  data: PropTypes.array,
  depth: PropTypes.number,
  slotProps: PropTypes.object,
  siblingPaths: PropTypes.arrayOf(PropTypes.string),
};

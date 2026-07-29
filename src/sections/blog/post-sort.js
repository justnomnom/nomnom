import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales/use-locales';

import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export default function PostSort({ sort, sortOptions, onSort }) {
  const { t } = useTranslate();
  const popover = usePopover();

  return (
    <>
      <Button
        disableRipple
        color="inherit"
        onClick={popover.onOpen}
        endIcon={<Iconify icon={popover.open ? ic.arrowIosUpwardFill : ic.arrowIosDownwardFill} />}
        sx={{ fontWeight: 'fontWeightSemiBold', textTransform: 'capitalize' }}
      >
        {t('components.empty_content.blog.sort_by')}
        <Box component="span" sx={{ ml: 0.5, fontWeight: 'fontWeightBold' }}>
          {sort}
        </Box>
      </Button>

      <CustomPopover open={popover.open} onClose={popover.onClose} sx={{ width: 140 }}>
        {sortOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={sort === option.value}
            onClick={() => {
              popover.onClose();
              onSort(option.value);
            }}
          >
            {t(option.label)}
          </MenuItem>
        ))}
      </CustomPopover>
    </>
  );
}

PostSort.propTypes = {
  onSort: PropTypes.func,
  sort: PropTypes.string,
  sortOptions: PropTypes.array,
};

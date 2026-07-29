import PropTypes from 'prop-types';
import { useRef, useState, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import useMediaQuery from '@mui/material/useMediaQuery';
import FormHelperText from '@mui/material/FormHelperText';

// ----------------------------------------------------------------------

export function RHFSelect({
  name,
  native,
  maxHeight = 220,
  helperText,
  children,
  PaperPropsSx,
  label,
  ...other
}) {
  const { control } = useFormContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const labelRef = useRef(null);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  // Check if label is truncated
  useEffect(() => {
    if (label && labelRef.current) {
      const element = labelRef.current;
      const isTruncated = element.scrollWidth > element.clientWidth;
      setShowTooltip(isTruncated);
    }
  }, [label]);

  const renderTextField = (field, error) => (
    <TextField
      {...field}
      select
      fullWidth
      label={label}
      SelectProps={{
        native,
        MenuProps: {
          ...(isMobile && {
            anchorOrigin: { vertical: 'top', horizontal: 'left' },
            transformOrigin: { vertical: 'bottom', horizontal: 'left' },
          }),
          slotProps: {
            paper: {
              sx: {
                ...(!native && {
                  maxHeight: typeof maxHeight === 'number' ? maxHeight : 'unset',
                }),
                ...PaperPropsSx,
              },
            },
          },
        },
        sx: { textTransform: 'capitalize' },
      }}
      error={!!error}
      helperText={error ? error?.message : helperText}
      InputLabelProps={{
        ...other.InputLabelProps,
        ref: labelRef,
        sx: {
          ...other.InputLabelProps?.sx,
          // Allow full label text to display on multiple lines
          maxWidth: '100%',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          lineHeight: 1.2,
        },
      }}
      {...other}
    >
      {children}
    </TextField>
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        if (showTooltip && label) {
          return (
            <Tooltip title={label} placement="top" arrow>
              <Box>{renderTextField(field, error)}</Box>
            </Tooltip>
          );
        }
        return renderTextField(field, error);
      }}
    />
  );
}

RHFSelect.propTypes = {
  PaperPropsSx: PropTypes.object,
  children: PropTypes.node,
  helperText: PropTypes.object,
  label: PropTypes.string,
  maxHeight: PropTypes.number,
  name: PropTypes.string,
  native: PropTypes.bool,
};

// ----------------------------------------------------------------------

export function RHFMultiSelect({
  name,
  chip,
  label,
  options,
  checkbox,
  placeholder,
  helperText,
  ...other
}) {
  const { control } = useFormContext();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  const renderValues = (selectedIds) => {
    const selectedItems = options.filter((item) => selectedIds.includes(item.value));

    if (!selectedItems.length && placeholder) {
      return <Box sx={{ color: 'text.disabled' }}>{placeholder}</Box>;
    }

    if (chip) {
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selectedItems.map((item) => (
            <Chip key={item.value} size="small" label={item.label} />
          ))}
        </Box>
      );
    }

    return selectedItems.map((item) => item.label).join(', ');
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl error={!!error} {...other}>
          {label && <InputLabel id={name}> {label} </InputLabel>}

          <Select
            {...field}
            multiple
            displayEmpty={!!placeholder}
            id={`multiple-${name}`}
            labelId={name}
            label={label}
            renderValue={renderValues}
            MenuProps={
              isMobile
                ? {
                    anchorOrigin: { vertical: 'top', horizontal: 'left' },
                    transformOrigin: { vertical: 'bottom', horizontal: 'left' },
                  }
                : undefined
            }
          >
            {options.map((option) => {
              const selected = field.value.includes(option.value);

              return (
                <MenuItem key={option.value} value={option.value}>
                  {checkbox && <Checkbox size="small" disableRipple checked={selected} />}

                  {option.label}
                </MenuItem>
              );
            })}
          </Select>

          {(!!error || helperText) && (
            <FormHelperText error={!!error}>{error ? error?.message : helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

RHFMultiSelect.propTypes = {
  checkbox: PropTypes.bool,
  chip: PropTypes.bool,
  helperText: PropTypes.object,
  label: PropTypes.string,
  name: PropTypes.string,
  options: PropTypes.array,
  placeholder: PropTypes.string,
};

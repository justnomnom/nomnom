import PropTypes from 'prop-types';
import { useRef, useState, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import useMediaQuery from '@mui/material/useMediaQuery';
import InputAdornment from '@mui/material/InputAdornment';

import { countries } from 'src/assets/data';
import { circleFlagIcon } from 'src/assets/icons';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function RHFAutocomplete({ name, label, type, helperText, placeholder, ...other }) {
  const { control, setValue } = useFormContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const labelRef = useRef(null);
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  const { multiple } = other;

  const mobilePopperProps = isMobile
    ? {
        slotProps: {
          popper: {
            placement: 'top-start',
            modifiers: [
              { name: 'flip', enabled: false },
              { name: 'preventOverflow', enabled: true, options: { altAxis: true } },
            ],
          },
          ...(other.slotProps || {}),
        },
      }
    : {};

  // Check if label is truncated
  useEffect(() => {
    if (label && labelRef.current) {
      const element = labelRef.current;
      const isTruncated = element.scrollWidth > element.clientWidth;
      setShowTooltip(isTruncated);
    }
  }, [label]);

  const renderTextField = (params, error) => {
    const baseField = {
      ...params,
      label,
      placeholder,
      error: !!error,
      helperText: error ? error?.message : helperText,
      inputProps: {
        ...params.inputProps,
        autoComplete: 'new-password',
      },
      InputLabelProps: {
        ...params.InputLabelProps,
        ref: labelRef,
        sx: {
          ...params.InputLabelProps?.sx,
          // Allow full label text to display on multiple lines
          maxWidth: '100%',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          lineHeight: 1.2,
        },
      },
    };

    if (multiple) {
      return <TextField {...baseField} />;
    }

    return (
      <TextField
        {...baseField}
        InputProps={{
          ...params.InputProps,
          startAdornment: (
            <InputAdornment
              position="start"
              sx={{
                ...(!getCountry(params.inputProps.value).code && {
                  display: 'none',
                }),
              }}
            >
              <Iconify
                icon={circleFlagIcon(getCountry(params.inputProps.value).code)}
                sx={{ mr: -0.5, ml: 0.5 }}
              />
            </InputAdornment>
          ),
        }}
      />
    );
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        if (type === 'country') {
          return (
            <Autocomplete
              {...field}
              id={`autocomplete-${name}`}
              autoHighlight={!multiple}
              disableCloseOnSelect={multiple}
              onChange={(event, newValue) => setValue(name, newValue, { shouldValidate: true })}
              renderOption={(props, option) => {
                const country = getCountry(option);

                if (!country.label) {
                  return null;
                }

                return (
                  <li {...props} key={country.label}>
                    <Iconify
                      key={country.label}
                      icon={circleFlagIcon(country.code)}
                      sx={{ mr: 1 }}
                    />
                    {country.label} ({country.code}) +{country.phone}
                  </li>
                );
              }}
              renderInput={(params) => {
                const textField = renderTextField(params, error);

                if (showTooltip && label) {
                  return (
                    <Tooltip title={label} placement="top" arrow>
                      <Box>{textField}</Box>
                    </Tooltip>
                  );
                }
                return textField;
              }}
              renderTags={(selected, getTagProps) =>
                selected.map((option, index) => {
                  const country = getCountry(option);

                  return (
                    <Chip
                      {...getTagProps({ index })}
                      key={country.label}
                      label={country.label}
                      icon={<Iconify icon={circleFlagIcon(country.code)} />}
                      size="small"
                      variant="soft"
                    />
                  );
                })
              }
              {...other}
              {...mobilePopperProps}
            />
          );
        }

        return (
          <Autocomplete
            {...field}
            id={`autocomplete-${name}`}
            onChange={(event, newValue) => setValue(name, newValue, { shouldValidate: true })}
            renderInput={(params) => {
              const textField = (
                <TextField
                  {...params}
                  label={label}
                  placeholder={placeholder}
                  error={!!error}
                  helperText={error ? error?.message : helperText}
                  inputProps={{
                    ...params.inputProps,
                    autoComplete: 'new-password',
                  }}
                  InputLabelProps={{
                    ...params.InputLabelProps,
                    ref: labelRef,
                    sx: {
                      ...params.InputLabelProps?.sx,
                      // Allow full label text to display on multiple lines
                      maxWidth: '100%',
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      lineHeight: 1.2,
                    },
                  }}
                />
              );

              if (showTooltip && label) {
                return (
                  <Tooltip title={label} placement="top" arrow>
                    <Box>{textField}</Box>
                  </Tooltip>
                );
              }
              return textField;
            }}
            {...other}
            {...mobilePopperProps}
          />
        );
      }}
    />
  );
}

RHFAutocomplete.propTypes = {
  name: PropTypes.string,
  type: PropTypes.string,
  label: PropTypes.string,
  helperText: PropTypes.node,
  placeholder: PropTypes.string,
};

// ----------------------------------------------------------------------

export function getCountry(inputValue) {
  const option = countries.filter((country) => country.label === inputValue)[0];

  return {
    ...option,
  };
}

import PropTypes from 'prop-types';
import { useRef, useState, useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';

// ----------------------------------------------------------------------

export default function RHFTextField({ name, helperText, type, label, ...other }) {
  const { control } = useFormContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const labelRef = useRef(null);

  // Check if label is truncated
  useEffect(() => {
    if (label && labelRef.current) {
      const element = labelRef.current;
      const isTruncated = element.scrollWidth > element.clientWidth;
      setShowTooltip(isTruncated);
    }
  }, [label]);

  const renderTextField = (field, error) => {
    const { onBlur: otherOnBlur, onFocus: otherOnFocus, InputLabelProps, ...restOther } = other;

    return (
      <TextField
        {...field}
        fullWidth
        type={type}
        label={label}
        value={type === 'number' && field.value === 0 ? '' : field.value}
        onChange={(event) => {
          if (type === 'number') {
            field.onChange(Number(event.target.value));
          } else {
            field.onChange(event.target.value);
          }
        }}
        onBlur={(event) => {
          field.onBlur();
          otherOnBlur?.(event);
        }}
        onFocus={(event) => {
          otherOnFocus?.(event);
        }}
        error={!!error}
        helperText={error ? error?.message : helperText}
        InputLabelProps={{
          ...InputLabelProps,
          ref: labelRef,
          sx: {
            ...InputLabelProps?.sx,
            // Allow full label text to display on multiple lines
            maxWidth: '100%',
            whiteSpace: 'normal',
            wordWrap: 'break-word',
            lineHeight: 1.2,
          },
        }}
        {...restOther}
      />
    );
  };

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

RHFTextField.propTypes = {
  helperText: PropTypes.object,
  label: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
};

import PropTypes from 'prop-types';
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';

import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import useTypography from './use-typography';

// ----------------------------------------------------------------------

const TextMaxLine = forwardRef(
  (
    {
      asLink,
      variant = 'body1',
      line = 2,
      persistent = false,
      children,
      sx,
      showTooltip = true,
      ...other
    },
    ref
  ) => {
    const { lineHeight } = useTypography(variant);
    const [showTooltipState, setShowTooltipState] = useState(false);
    const textRef = useRef(null);

    // Forward ref to the text element
    useImperativeHandle(ref, () => textRef.current, []);

    // Check if text is truncated
    useEffect(() => {
      if (showTooltip && textRef.current) {
        const element = textRef.current;
        const isTruncated =
          element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
        setShowTooltipState(isTruncated);
      }
    }, [children, showTooltip]);

    const styles = {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: '-webkit-box',
      WebkitLineClamp: line,
      WebkitBoxOrient: 'vertical',
      ...(persistent && {
        height: lineHeight * line,
      }),
      ...sx,
    };

    const content = (
      <Typography ref={textRef} variant={variant} sx={{ ...styles }} {...other}>
        {children}
      </Typography>
    );

    const linkContent = (
      <Link color="inherit" ref={textRef} variant={variant} sx={{ ...styles }} {...other}>
        {children}
      </Link>
    );

    // If tooltip is disabled or text is not truncated, return without tooltip
    if (!showTooltip || !showTooltipState) {
      return asLink ? linkContent : content;
    }

    // Return with tooltip for truncated text
    return (
      <Tooltip title={children} placement="top" arrow>
        {asLink ? linkContent : content}
      </Tooltip>
    );
  }
);

TextMaxLine.propTypes = {
  asLink: PropTypes.bool,
  children: PropTypes.node,
  line: PropTypes.number,
  persistent: PropTypes.bool,
  showTooltip: PropTypes.bool,
  sx: PropTypes.object,
  variant: PropTypes.oneOf([
    'body1',
    'body2',
    'button',
    'caption',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'inherit',
    'overline',
    'subtitle1',
    'subtitle2',
  ]),
};

export default TextMaxLine;

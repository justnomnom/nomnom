import { alpha, styled } from '@mui/material/styles';

import { readableAccent } from 'src/theme/readable-accent';

// ----------------------------------------------------------------------

const StyledMarkdown = styled('div')(({ theme }) => {
  const lightMode = theme.palette.mode === 'light';

  return {
    // Text
    h1: {
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(2),
      ...theme.typography.h1,
      '&:first-of-type': {
        marginTop: 0,
      },
    },
    h2: {
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(2),
      ...theme.typography.h2,
      '&:first-of-type': {
        marginTop: 0,
      },
    },
    h3: {
      marginTop: theme.spacing(2.5),
      marginBottom: theme.spacing(1.5),
      ...theme.typography.h3,
      '&:first-of-type': {
        marginTop: 0,
      },
    },
    h4: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1.5),
      ...theme.typography.h4,
      '&:first-of-type': {
        marginTop: 0,
      },
    },
    h5: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
      ...theme.typography.h5,
      '&:first-of-type': {
        marginTop: 0,
      },
    },
    h6: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(1),
      ...theme.typography.h6,
      '&:first-of-type': {
        marginTop: 0,
      },
    },
    p: {
      marginTop: 0,
      marginBottom: theme.spacing(2),
      ...theme.typography.body1,
      '&:last-child': {
        marginBottom: 0,
      },
    },

    a: {
      color: readableAccent(theme),
      textDecoration: 'underline',
      textDecorationColor: alpha(readableAccent(theme), 0.32),
      '&:hover': {
        textDecorationColor: readableAccent(theme),
      },
    },

    // Tailwind "not-prose" sections inside content hub (listing chips, story rows, etc.)
    '& section.not-prose, & nav.not-prose, & ul.not-prose, & ol.not-prose': {
      '& h2': {
        marginTop: 0,
        marginBottom: theme.spacing(1.5),
        fontSize: '1.25rem',
        fontWeight: theme.typography.fontWeightSemiBold,
        lineHeight: 1.375,
        color: theme.palette.text.primary,
      },
      '& ul, & ol': {
        listStyle: 'none',
        paddingLeft: 0,
        marginTop: theme.spacing(1.5),
        marginBottom: 0,
      },
      '& li': {
        marginBottom: 0,
        display: 'block',
      },
      // Escape StyledMarkdown `a { underline }` so hub CTAs control their own chrome
      '& a': {
        color: 'inherit',
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'none',
        },
      },
    },
    '& ul.not-prose, & ol.not-prose': {
      listStyle: 'none',
      paddingLeft: 0,
      marginTop: theme.spacing(1.5),
      marginBottom: 0,
    },

    br: {
      display: 'block',
      content: '""',
      marginTop: theme.spacing(1),
    },

    // Divider
    hr: {
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(3),
      flexShrink: 0,
      borderWidth: 0,
      msFlexNegative: 0,
      WebkitFlexShrink: 0,
      borderStyle: 'solid',
      borderBottomWidth: 'thin',
      borderColor: theme.palette.divider,
    },

    // List
    '& ul, & ol': {
      marginTop: theme.spacing(1.5),
      marginBottom: theme.spacing(2),
      paddingLeft: theme.spacing(4),
      '& ul, & ol': {
        marginTop: theme.spacing(0.5),
        marginBottom: theme.spacing(0.5),
      },
      '& li': {
        marginBottom: theme.spacing(1),
        lineHeight: 1.75,
        '&:last-child': {
          marginBottom: 0,
        },
        '& p': {
          marginBottom: theme.spacing(0.5),
        },
      },
    },
    '& ul': {
      listStyleType: 'disc',
      '& ul': {
        listStyleType: 'circle',
        '& ul': {
          listStyleType: 'square',
        },
      },
    },
    '& ol': {
      listStyleType: 'decimal',
      '& ol': {
        listStyleType: 'lower-alpha',
        '& ol': {
          listStyleType: 'lower-roman',
        },
      },
    },

    // Blockquote
    '& blockquote': {
      lineHeight: 1.75,
      fontSize: theme.typography.body1.fontSize,
      marginTop: theme.spacing(3),
      marginBottom: theme.spacing(3),
      marginLeft: 'auto',
      marginRight: 'auto',
      position: 'relative',
      fontFamily: theme.typography.fontSecondaryFamily,
      padding: theme.spacing(3, 3, 3, 8),
      color: theme.palette.text.secondary,
      borderRadius: theme.shape.borderRadius * 2,
      backgroundColor: alpha(theme.palette.primary.main, 0.045),
      border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
      [theme.breakpoints.up('md')]: {
        width: '80%',
      },
      '& p, & span': {
        marginBottom: theme.spacing(1),
        fontSize: 'inherit',
        fontFamily: 'inherit',
        '&:last-child': {
          marginBottom: 0,
        },
      },
      '&:before': {
        left: 16,
        top: -8,
        display: 'block',
        fontSize: '3em',
        content: '"\\201C"',
        position: 'absolute',
        color: alpha(theme.palette.primary.main, 0.35),
      },
    },

    // Code Block
    '& pre': {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
      fontSize: theme.typography.body1.fontSize,
      overflowX: 'auto',
      whiteSpace: 'pre',
      padding: theme.spacing(2),
      color: theme.palette.common.white,
      borderRadius: theme.shape.borderRadius,
      backgroundColor: lightMode ? theme.palette.grey[900] : alpha(theme.palette.grey[500], 0.16),
      '& > code': {
        padding: 0,
        backgroundColor: 'transparent',
        color: 'inherit',
      },
    },
    '& code': {
      fontSize: theme.typography.body2.fontSize,
      borderRadius: 4,
      whiteSpace: 'pre',
      padding: theme.spacing(0.2, 0.5),
      color: theme.palette.warning[lightMode ? 'darker' : 'lighter'],
      backgroundColor: theme.palette.warning[lightMode ? 'lighter' : 'darker'],
      '&.hljs': { padding: 0, backgroundColor: 'transparent' },
    },

    // Image
    img: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
      maxWidth: '100%',
      height: 'auto',
    },

    // Table
    table: {
      width: '100%',
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
      borderCollapse: 'collapse',
      border: `1px solid ${theme.palette.divider}`,
      'th, td': {
        padding: theme.spacing(1.5),
        border: `1px solid ${theme.palette.divider}`,
      },
      'tbody tr:nth-of-type(odd)': {
        backgroundColor: theme.palette.background.neutral,
      },
    },

    // Checkbox
    input: {
      '&[type=checkbox]': {
        position: 'relative',
        cursor: 'pointer',
        '&:before': {
          content: '""',
          top: -2,
          left: -2,
          width: 17,
          height: 17,
          borderRadius: 3,
          position: 'absolute',
          backgroundColor: theme.palette.grey[lightMode ? 300 : 700],
        },
        '&:checked': {
          '&:before': {
            backgroundColor: theme.palette.primary.main,
          },
          '&:after': {
            content: '""',
            top: 1,
            left: 5,
            width: 4,
            height: 9,
            position: 'absolute',
            transform: 'rotate(45deg)',
            msTransform: 'rotate(45deg)',
            WebkitTransform: 'rotate(45deg)',
            border: `solid ${theme.palette.common.white}`,
            borderWidth: '0 2px 2px 0',
          },
        },
      },
    },
  };
});

export default StyledMarkdown;

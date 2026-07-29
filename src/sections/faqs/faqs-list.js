import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import Container from '@mui/material/Container';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';

import Iconify from 'src/components/iconify';

import {
  sectionLabelSx,
  HUB_ROW_MIN_HEIGHT,
} from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

const FAQ_ITEMS = [
  {
    id: 'general-1',
    category: 'general',
  },
  {
    id: 'general-2',
    category: 'general',
  },
  {
    id: 'general-3',
    category: 'general',
  },
  {
    id: 'general-4',
    category: 'general',
  },
  {
    id: 'general-5',
    category: 'general',
  },
  {
    id: 'payment-1',
    category: 'payment',
  },
  {
    id: 'payment-2',
    category: 'payment',
  },
  {
    id: 'getting_started-2',
    category: 'getting_started',
  },
  {
    id: 'getting_started-3',
    category: 'getting_started',
  },
];

export default function FaqsList({ variant = 'page', titleHeading = 'h2' }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const isSettings = variant === 'settings';

  const listHeader = isSettings ? (
    <Typography component="h2" sx={sectionLabelSx(theme)} mb={1.5}>
      {t('pages.faqs.list.title')}
    </Typography>
  ) : (
    <Typography
      component={titleHeading}
      variant="h4"
      sx={{
        mb: { xs: 3, md: 5 },
        fontSize: { xs: '1.5rem', sm: undefined },
        px: { xs: 1, sm: 0 },
      }}
    >
      {t('pages.faqs.list.title')}
    </Typography>
  );

  const accordions = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 1.5, md: 2 },
        mb: isSettings ? { xs: 1, md: 2 } : { xs: 4, md: 8 },
        maxWidth: { xs: '100%', md: isSettings ? '100%' : '800px' },
        width: '100%',
        mx: 'auto',
      }}
    >
      {FAQ_ITEMS.map((faq) => (
        <Accordion
          key={faq.id}
          disableGutters
          slotProps={{ heading: { component: 'div' } }}
          sx={{
            '&:before': { display: 'none' },
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <AccordionSummary
            expandIcon={<Iconify icon={ic.arrowIosDownwardFill} width={22} />}
            sx={{
              minHeight: { xs: HUB_ROW_MIN_HEIGHT, sm: HUB_ROW_MIN_HEIGHT },
              px: { xs: 1.5, sm: 2 },
              WebkitTapHighlightColor: 'transparent',
              transition: theme.transitions.create('background-color', {
                duration: theme.transitions.duration.shorter,
              }),
              '& .MuiAccordionSummary-content': { my: 1.25 },
              '&:active': {
                bgcolor: theme.palette.action.hover,
              },
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                textAlign: 'left',
                overflowWrap: 'anywhere',
                pr: 1,
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: undefined },
              }}
            >
              {t(`pages.faqs.${faq.category}.${faq.id}.question`)}
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={{ px: { xs: 1.5, sm: 2 }, pt: 0, pb: 2 }}>
            <Typography sx={{ textAlign: 'left', overflowWrap: 'anywhere', lineHeight: 1.65 }}>
              {t(`pages.faqs.${faq.category}.${faq.id}.answer`)}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  if (isSettings) {
    return (
      <Box sx={{ width: 1 }}>
        {listHeader}
        {accordions}
      </Box>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        mx: 'auto',
        px: 0,
      }}
    >
      {listHeader}
      {accordions}
    </Container>
  );
}

FaqsList.propTypes = {
  variant: PropTypes.oneOf(['page', 'settings']),
  /** Page layout only. Use `h1` on the standalone FAQs route; default `h2` when the page already has an `h1` (e.g. home). */
  titleHeading: PropTypes.oneOf(['h1', 'h2']),
};

import PropTypes from 'prop-types';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Video from 'yet-another-react-lightbox/plugins/video';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import ReactLightbox, { useLightboxState } from 'yet-another-react-lightbox';

import Box from '@mui/material/Box';

import { ic } from 'src/assets/icons';

import Iconify from '../iconify';
import StyledLightbox from './styles';

// ----------------------------------------------------------------------

export default function Lightbox({
  slides,
  disabledZoom,
  disabledVideo,
  disabledTotal,
  disabledCaptions,
  disabledSlideshow,
  disabledThumbnails,
  disabledFullscreen,
  onGetCurrentIndex,
  carousel,
  ...other
}) {
  const totalItems = slides ? slides.length : 0;

  return (
    <>
      <StyledLightbox />

      <ReactLightbox
        slides={slides}
        animation={{ swipe: 240 }}
        carousel={{ finite: totalItems < 5, ...carousel }}
        controller={{ closeOnBackdropClick: true }}
        plugins={getPlugins({
          disabledZoom,
          disabledVideo,
          disabledCaptions,
          disabledSlideshow,
          disabledThumbnails,
          disabledFullscreen,
        })}
        on={{
          view: ({ index }) => {
            if (onGetCurrentIndex) {
              onGetCurrentIndex(index);
            }
          },
        }}
        toolbar={{
          buttons: [
            <DisplayTotal key={0} totalItems={totalItems} disabledTotal={disabledTotal} />,
            'close',
          ],
        }}
        render={{
          iconClose: () => <Iconify width={24} icon={ic.close} />,
          iconZoomIn: () => <Iconify width={24} icon={ic.carbonZoomIn} />,
          iconZoomOut: () => <Iconify width={24} icon={ic.carbonZoomOut} />,
          iconSlideshowPlay: () => <Iconify width={24} icon={ic.carbonPlay} />,
          iconSlideshowPause: () => <Iconify width={24} icon={ic.carbonPause} />,
          iconPrev: () => <Iconify width={32} icon={ic.carbonChevronLeft} />,
          iconNext: () => <Iconify width={32} icon={ic.carbonChevronRight} />,
          iconExitFullscreen: () => <Iconify width={24} icon={ic.carbonCenterToFit} />,
          iconEnterFullscreen: () => <Iconify width={24} icon={ic.carbonFitToScreen} />,
        }}
        {...other}
      />
    </>
  );
}

Lightbox.propTypes = {
  carousel: PropTypes.object,
  disabledCaptions: PropTypes.bool,
  disabledFullscreen: PropTypes.bool,
  disabledSlideshow: PropTypes.bool,
  disabledThumbnails: PropTypes.bool,
  disabledTotal: PropTypes.bool,
  disabledVideo: PropTypes.bool,
  disabledZoom: PropTypes.bool,
  onGetCurrentIndex: PropTypes.func,
  slides: PropTypes.array,
};

// ----------------------------------------------------------------------

export function getPlugins({
  disabledZoom,
  disabledVideo,
  disabledCaptions,
  disabledSlideshow,
  disabledThumbnails,
  disabledFullscreen,
}) {
  let plugins = [Captions, Fullscreen, Slideshow, Thumbnails, Video, Zoom];

  if (disabledThumbnails) {
    plugins = plugins.filter((plugin) => plugin !== Thumbnails);
  }
  if (disabledCaptions) {
    plugins = plugins.filter((plugin) => plugin !== Captions);
  }
  if (disabledFullscreen) {
    plugins = plugins.filter((plugin) => plugin !== Fullscreen);
  }
  if (disabledSlideshow) {
    plugins = plugins.filter((plugin) => plugin !== Slideshow);
  }
  if (disabledZoom) {
    plugins = plugins.filter((plugin) => plugin !== Zoom);
  }
  if (disabledVideo) {
    plugins = plugins.filter((plugin) => plugin !== Video);
  }

  return plugins;
}

// ----------------------------------------------------------------------

export function DisplayTotal({ totalItems, disabledTotal }) {
  const { currentIndex } = useLightboxState();

  if (disabledTotal) {
    return null;
  }

  return (
    <Box
      component="span"
      className="yarl__button"
      sx={{
        typography: 'body2',
        alignItems: 'center',
        display: 'inline-flex',
        justifyContent: 'center',
      }}
    >
      <strong> {currentIndex + 1} </strong> / {totalItems}
    </Box>
  );
}

DisplayTotal.propTypes = {
  disabledTotal: PropTypes.bool,
  totalItems: PropTypes.number,
};

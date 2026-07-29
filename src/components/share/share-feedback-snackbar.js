import PropTypes from 'prop-types';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

// ----------------------------------------------------------------------

/**
 * Bottom-center toast for `useShareLink` feedback. The hook owns the
 * auto-dismiss timer, so this only renders while `feedback` is set.
 */
export default function ShareFeedbackSnackbar({ feedback, onClose, sx }) {
  return (
    <Snackbar
      open={Boolean(feedback)}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={sx}
    >
      <Alert
        severity={feedback?.severity ?? 'success'}
        variant="filled"
        onClose={onClose}
        sx={{ width: 1 }}
      >
        {feedback?.text}
      </Alert>
    </Snackbar>
  );
}

ShareFeedbackSnackbar.propTypes = {
  feedback: PropTypes.shape({
    severity: PropTypes.oneOf(['success', 'error']),
    text: PropTypes.string,
  }),
  onClose: PropTypes.func,
  sx: PropTypes.object,
};

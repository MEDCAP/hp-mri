import React from 'react';
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography
} from '@mui/material';
import { StyledDialog, Transition } from '../../../components/dialogs/AppDialog';

interface ReplaceDuplicatesDialogProps {
  open: boolean;
  /** Upload names that match files the caller already owns. */
  names: string[];
  onReplace: () => void;
  onKeepBoth: () => void;
  onCancel: () => void;
}

/** Asked before an upload whose names match files the caller already has. */
const ReplaceDuplicatesDialog: React.FC<ReplaceDuplicatesDialogProps> = ({
  open,
  names,
  onReplace,
  onKeepBoth,
  onCancel,
}) => (
  <StyledDialog open={open} onClose={onCancel} TransitionComponent={Transition} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ fontWeight: 'bold' }}>
      {names.length === 1 ? 'A file with this name exists' : `${names.length} files with these names exist`}
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="textSecondary">
        You already have:
      </Typography>
      <List dense>
        {names.map((name) => (
          <ListItem key={name} disableGutters>
            <ListItemText primary={name} primaryTypographyProps={{ sx: { fontFamily: 'monospace' } }} />
          </ListItem>
        ))}
      </List>
      <Typography variant="body2" color="textSecondary">
        Replace deletes your existing copy once the new upload succeeds.
      </Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button onClick={onKeepBoth} variant="outlined">Keep both</Button>
      <Button onClick={onReplace} variant="contained" color="warning">Replace</Button>
    </DialogActions>
  </StyledDialog>
);

export default ReplaceDuplicatesDialog;

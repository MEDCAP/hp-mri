import React, { useState } from 'react';
import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { shareMrdFile } from '../../../api/mrdFiles';
import { getApiErrorMessage } from '../../../api/client';
import { MRDFile } from '../../../types/mrd';
import { useGroups } from '../../groups/hooks/useGroups';

// Select needs a string value; the backend's private is groupName null.
const PRIVATE = '';

interface VisibilitySelectProps {
  file: MRDFile;
  onChanged: (groupName: string | null) => void;
}

/**
 * Owner-only control for who can see a file: private, or one of the owner's
 * groups. The backend only accepts groups the owner really belongs to, so
 * "public" is offered only to members of the public group.
 */
const VisibilitySelect: React.FC<VisibilitySelectProps> = ({ file, onChanged }) => {
  const { groups, loading } = useGroups();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = file.groupName ?? PRIVATE;
  const currentIsListed = current === PRIVATE || groups.some((g) => g.name === current);

  const handleChange = async (value: string) => {
    if (value === current) return; // the backend 400s on a no-op change
    const groupName = value === PRIVATE ? null : value;
    try {
      setSaving(true);
      setError(null);
      await shareMrdFile(file._id, groupName);
      onChanged(groupName);
    } catch (err) {
      console.error('Error changing file visibility:', err);
      setError(getApiErrorMessage(err, 'Failed to change visibility'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FormControl fullWidth size="small" sx={{ mt: 1.5 }} disabled={saving || loading}>
        <InputLabel id="visibility-label">Visibility</InputLabel>
        <Select
          labelId="visibility-label"
          label="Visibility"
          value={current}
          onChange={(e) => handleChange(e.target.value)}
        >
          <MenuItem value={PRIVATE}>Private</MenuItem>
          {groups.map((group) => (
            <MenuItem key={group.name} value={group.name}>
              {group.name === 'public' ? 'Public' : group.displayName || group.name}
            </MenuItem>
          ))}
          {!currentIsListed && (
            <MenuItem value={current} disabled>{current === 'public' ? 'Public' : current}</MenuItem>
          )}
        </Select>
      </FormControl>
      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
    </>
  );
};

export default VisibilitySelect;

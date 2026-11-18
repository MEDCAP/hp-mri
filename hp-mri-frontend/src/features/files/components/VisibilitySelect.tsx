import React, { useState } from 'react';
import { Alert, Box } from '@mui/material';
import { shareMrdFile } from '../../../api/mrdFiles';
import { getApiErrorMessage } from '../../../api/client';
import { MRDFile } from '../../../types/mrd';
import GroupSelect from './GroupSelect';

interface VisibilitySelectProps {
  file: MRDFile;
  onChanged: (groupName: string | null) => void;
}

/** Owner-only control for who can see an uploaded file. */
const VisibilitySelect: React.FC<VisibilitySelectProps> = ({ file, onChanged }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = file.groupName ?? null;

  const handleChange = async (groupName: string | null) => {
    if (groupName === current) return; // the backend 400s on a no-op change
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
      <Box sx={{ mt: 1.5 }}>
        <GroupSelect label="Visibility" value={current} onChange={handleChange} disabled={saving} />
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
    </>
  );
};

export default VisibilitySelect;

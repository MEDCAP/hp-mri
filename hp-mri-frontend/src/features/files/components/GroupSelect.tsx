import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useGroups } from '../../groups/hooks/useGroups';

// Select needs a non-empty string (MUI renders '' as no value); the
// backend's private is groupName null.
const PRIVATE = '__private__';

interface GroupSelectProps {
  /** Selected group name; `null` is private. */
  value: string | null;
  onChange: (groupName: string | null) => void;
  label: string;
  disabled?: boolean;
}

/**
 * Pick who can see a file: private, or one of the caller's groups. The backend
 * only accepts groups the caller really belongs to, so "public" is offered only
 * to members of the public group.
 */
const GroupSelect: React.FC<GroupSelectProps> = ({ value, onChange, label, disabled }) => {
  const { groups, loading } = useGroups();

  const current = value ?? PRIVATE;
  const currentIsListed = current === PRIVATE || groups.some((g) => g.name === current);

  return (
    <FormControl fullWidth size="small" disabled={disabled || loading}>
      <InputLabel id="group-select-label">{label}</InputLabel>
      <Select
        labelId="group-select-label"
        label={label}
        value={current}
        onChange={(e) => onChange(e.target.value === PRIVATE ? null : e.target.value)}
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
  );
};

export default GroupSelect;

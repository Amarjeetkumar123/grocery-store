import { useState } from 'react';
import { callApi } from '../../apiClient.js';
import { useApiData } from '../../useApiData.js';
import { useSaveRequest } from '../../useSaveRequest.js';
import { TextField } from '../../FormFields.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

const roleOptions = [['owner', 'Owner'], ['packer', 'Packer'], ['rider', 'Rider']];

function RoleSelect({ value, onChange, fieldId }) {
  return (
    <select id={fieldId} className="input input-small" value={value} onChange={(event) => onChange(event.target.value)} aria-label="Role">
      {roleOptions.map(([role, label]) => <option key={role} value={role}>{label}</option>)}
    </select>
  );
}

function AddStaffForm({ onAdded }) {
  const blank = { email: '', name: '', phone: '', role: 'rider' };
  const [values, setValues] = useState(blank);
  const { saving, error, fieldErrors, save } = useSaveRequest();
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));
  async function handleSubmit(event) {
    event.preventDefault();
    if (await save(() => callApi('/api/admin/staff', { method: 'POST', body: values }))) {
      setValues(blank);
      onAdded();
    }
  }
  return (
    <form className="card form-section" onSubmit={handleSubmit}>
      <h2>Add a team member</h2>
      <p className="hint">They sign in with <strong>Google</strong> using this email. Password logins are never given staff access.</p>
      <div className="field-row">
        <TextField fieldId="staffEmail" label="Google email" type="email" value={values.email} onChange={update('email')} errorMessage={fieldErrors.email} required />
        <TextField fieldId="staffName" label="Name" value={values.name} onChange={update('name')} errorMessage={fieldErrors.name} maxLength={60} />
        <TextField fieldId="staffPhone" label="Phone (optional)" inputMode="tel" value={values.phone} onChange={update('phone')} errorMessage={fieldErrors.phone} />
        <div className="field"><label htmlFor="staffRole">Role</label><RoleSelect fieldId="staffRole" value={values.role} onChange={update('role')} /></div>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="form-actions"><button type="submit" className="button button-compact" disabled={saving}>{saving ? 'Adding…' : 'Add'}</button></div>
    </form>
  );
}

function StaffRow({ member, onSaved }) {
  const [values, setValues] = useState({ name: member.name, phone: member.phone ?? '', role: member.role, active: member.active });
  const { saving, error, save } = useSaveRequest();
  const update = (fieldName) => (value) => setValues((previous) => ({ ...previous, [fieldName]: value }));
  const changed = values.name !== member.name || values.phone !== (member.phone ?? '') || values.role !== member.role || values.active !== member.active;
  async function saveRow() {
    if (await save(() => callApi(`/api/admin/staff/${member.id}`, { method: 'PUT', body: values }))) onSaved();
  }
  return (
    <tr className={member.active ? '' : 'row-inactive'}>
      <td>{member.email}<br /><span className={`pill ${member.signedIn ? 'pill-green' : 'pill-gray'}`}>{member.signedIn ? 'Signed in' : 'Not signed in yet'}</span></td>
      <td><input className="input input-small" value={values.name} onChange={(event) => update('name')(event.target.value)} aria-label={`Name of ${member.email}`} /></td>
      <td><input className="input input-small" value={values.phone} onChange={(event) => update('phone')(event.target.value)} aria-label={`Phone of ${member.email}`} /></td>
      <td><RoleSelect value={values.role} onChange={update('role')} /></td>
      <td><label className="checkbox-label"><input type="checkbox" checked={values.active} onChange={(event) => update('active')(event.target.checked)} /> Active</label></td>
      <td>
        <button type="button" className="button button-compact" disabled={!changed || saving} onClick={saveRow}>Save</button>
        {error && <p className="field-error" role="alert">{error}</p>}
      </td>
    </tr>
  );
}

// Inactive members can no longer sign in to the admin or rider screens.
export function AdminStaffPage() {
  const { data, error, loading, reload } = useApiData('/api/admin/staff');
  return (
    <>
      <AdminPageHeader title="Staff" />
      <AddStaffForm onAdded={reload} />
      <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
      {data && (
        <div className="table-box">
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Name</th><th>Phone</th><th>Role</th><th>Access</th><th /></tr></thead>
            <tbody>{data.staff.map((member) => <StaffRow key={`${member.id}-${member.name}-${member.role}-${member.active}`} member={member} onSaved={reload} />)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

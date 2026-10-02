// Labelled inputs that show the server's error message under the field.

function FieldError({ fieldId, message }) {
  if (!message) return null;
  return <p id={`${fieldId}-error`} className="field-error">{message}</p>;
}

export function TextField({ fieldId, label, value, onChange, errorMessage, ...inputProperties }) {
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        className={errorMessage ? 'input input-invalid' : 'input'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
        {...inputProperties}
      />
      <FieldError fieldId={fieldId} message={errorMessage} />
    </div>
  );
}

export function SelectField({ fieldId, label, value, onChange, errorMessage, placeholder, options }) {
  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <select
        id={fieldId}
        className={errorMessage ? 'input input-invalid' : 'input'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(errorMessage)}
        aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
      <FieldError fieldId={fieldId} message={errorMessage} />
    </div>
  );
}

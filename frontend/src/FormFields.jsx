// Labelled inputs that show the server's error message under the field.

function FieldError({ fieldId, message }) {
  if (!message) return null;
  return <p id={`${fieldId}-error`} className="field-error">{message}</p>;
}

// className: extra class for the wrapper, e.g. to size it in a row.
// prefix / suffix: a short tag inside the box, e.g. "₹", "+91" or "km".
export function TextField({ fieldId, label, value, onChange, errorMessage, className, prefix, suffix, hint, ...inputProperties }) {
  const input = (
    <input
      id={fieldId}
      className={errorMessage ? 'input input-invalid' : 'input'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={Boolean(errorMessage)}
      aria-describedby={errorMessage ? `${fieldId}-error` : undefined}
      {...inputProperties}
    />
  );
  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label htmlFor={fieldId}>{label}</label>
      {prefix || suffix ? <div className="input-affix" style={prefix ? { '--prefix-length': prefix.length } : undefined}>{prefix && <span className="input-prefix">{prefix}</span>}{input}{suffix && <span className="input-suffix">{suffix}</span>}</div> : input}
      {hint && !errorMessage && <p className="field-hint">{hint}</p>}
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

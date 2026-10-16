import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../Icon.jsx';

const DialogContext = createContext(null);

// In-app popups instead of the browser's confirm() and prompt().
//   confirm({ title, message, confirmLabel, cancelLabel, tone: 'danger', icon }) -> true / false
//   prompt({ ...the same, label, defaultValue, placeholder, inputMode, multiline, required }) -> text / null
// A yes/no question is small; one that asks for text is medium. size: 'small' | 'medium' overrides it.
export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }) {
  const [request, setRequest] = useState(null);
  const open = useCallback((kind, options) => new Promise((resolve) => setRequest({ kind, options, resolve })), []);
  const dialog = useMemo(() => ({
    confirm: (options) => open('confirm', options),
    prompt: (options) => open('prompt', options),
  }), [open]);
  function close(answer) {
    request.resolve(answer);
    setRequest(null);
  }
  return (
    <DialogContext.Provider value={dialog}>
      {children}
      {request && <Popup request={request} onClose={close} />}
    </DialogContext.Provider>
  );
}

function PromptField({ options, value, setValue }) {
  const shared = {
    id: 'popup-input', className: 'input', value, autoFocus: true, placeholder: options.placeholder,
    onChange: (event) => setValue(event.target.value),
  };
  return (
    <label className="popup-field" htmlFor="popup-input">
      {options.label && <span>{options.label}</span>}
      {options.multiline ? <textarea rows={3} maxLength={200} {...shared} /> : <input inputMode={options.inputMode} {...shared} />}
    </label>
  );
}

// A risky question starts on Cancel, so Enter never deletes by accident.
function Popup({ request, onClose }) {
  const { kind, options } = request;
  const dialogRef = useRef(null);
  const [value, setValue] = useState(options.defaultValue ?? '');
  const tone = options.tone ?? 'default';
  const size = options.size ?? (kind === 'prompt' ? 'medium' : 'small');
  const cancelAnswer = kind === 'prompt' ? null : false;
  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal();
  }, []);
  function submit(event) {
    event.preventDefault();
    onClose(kind === 'prompt' ? value.trim() : true);
  }
  return (
    <dialog ref={dialogRef} className={`popup popup-${size} popup-${tone}`} aria-labelledby="popup-title"
      onCancel={(event) => { event.preventDefault(); onClose(cancelAnswer); }}
      onClick={(event) => event.target === dialogRef.current && onClose(cancelAnswer)}>
      <form onSubmit={submit}>
        <span className="popup-icon" aria-hidden="true"><Icon name={options.icon ?? (tone === 'danger' ? 'trash' : 'check')} size={20} /></span>
        <h2 id="popup-title">{options.title}</h2>
        {options.message && <p className="popup-message">{options.message}</p>}
        {kind === 'prompt' && <PromptField options={options} value={value} setValue={setValue} />}
        <div className="popup-actions">
          <button type="button" className="button button-outline" onClick={() => onClose(cancelAnswer)}>{options.cancelLabel ?? 'Cancel'}</button>
          <button type="submit" className={`button${tone === 'danger' ? ' button-danger' : ''}`} autoFocus={kind === 'confirm' && tone !== 'danger'}
            disabled={kind === 'prompt' && options.required && !value.trim()}>
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

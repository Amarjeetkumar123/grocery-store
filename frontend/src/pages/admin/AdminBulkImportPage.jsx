import { useState } from 'react';
import { Link } from 'react-router';
import { callApi } from '../../apiClient.js';
import { Icon } from '../../Icon.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

const templateColumns = [
  ['Category', true], ['Product name', true], ['Brand', false], ['Pack size', true], ['MRP', true], ['Price', true],
  ['Stock', true], ['Low stock alert', false], ['Best before', false], ['Manufacturer', false], ['Description', false],
];

function TemplateStep() {
  return (
    <section className="card import-step">
      <span className="step-number">1</span>
      <h2>Download the template</h2>
      <p className="hint">One row per pack size. Solid columns must be filled; dashed ones are optional.</p>
      <div className="column-chips">{templateColumns.map(([name, required]) => <span key={name} className={required ? '' : 'optional'}>{name}</span>)}</div>
      <a href="/product-upload-template.csv" download className="button button-outline button-compact align-start step-action"><Icon name="down" /> Download template</a>
    </section>
  );
}

function RulesStep() {
  return (
    <section className="card import-step">
      <span className="step-number">2</span>
      <h2>Fill it in</h2>
      <ul className="import-rules">
        <li>Category names are matched ignoring capitals and spaces. A name that does not exist yet <strong>adds a new category</strong>.</li>
        <li>A row with a product and pack size that already exist <strong>updates its price and stock</strong>.</li>
        <li>Dates as <strong>YYYY-MM-DD</strong>, e.g. 2027-03-31.</li>
        <li>Save it as <strong>CSV</strong> from Excel or Google Sheets.</li>
      </ul>
    </section>
  );
}

// Rows below the heading line, for "38 rows".
const rowCountOf = (text) => Math.max(text.split(/\r?\n/).filter((line) => line.trim()).length - 1, 0);

function ChosenFile({ file, onClear }) {
  return (
    <div className="file-row">
      <span className="file-icon">CSV</span>
      <span className="file-name">{file.name}<small>{Math.max(1, Math.round(file.size / 1024))} KB · {file.rowCount} {file.rowCount === 1 ? 'row' : 'rows'}</small></span>
      <button type="button" className="icon-button" onClick={onClear} aria-label="Remove file"><Icon name="close" size={16} /></button>
    </div>
  );
}

// Drop a file on the box, or click it to choose one.
function DropZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const drop = (event) => { event.preventDefault(); setDragging(false); onFile(event.dataTransfer.files?.[0]); };
  return (
    <label className={dragging ? 'drop-zone drop-zone-active' : 'drop-zone'} onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)} onDrop={drop}>
      <Icon name="upload" />
      <strong>Drop your CSV file here</strong>
      <span>or <u>choose a file</u></span>
      <input type="file" accept=".csv,text/csv" onChange={(event) => { onFile(event.target.files?.[0]); event.target.value = ''; }} />
    </label>
  );
}

function UploadStep({ file, onFile, onClear, uploading, onUpload }) {
  return (
    <section className="card import-step">
      <span className="step-number">3</span>
      <h2>Upload it</h2>
      <p className="hint">If any row has a problem, nothing is saved and each problem is listed.</p>
      {file ? <ChosenFile file={file} onClear={onClear} /> : <DropZone onFile={onFile} />}
      {file && (
        <button type="button" className="button button-compact align-start step-action" disabled={uploading} onClick={onUpload}>
          {uploading ? <><span className="spinner" aria-hidden="true" /> Uploading…</> : <><Icon name="upload" /> Upload {file.rowCount} {file.rowCount === 1 ? 'row' : 'rows'}</>}
        </button>
      )}
    </section>
  );
}

function ImportResult({ summary, problems, errorMessage }) {
  if (summary) {
    const newCategories = summary.categoriesCreated ?? [];
    return (
      <div className="import-saved" role="status">
        <Icon name="check" />
        <span><strong>Saved.</strong> {summary.productsCreated} new products, {summary.packSizesCreated} new pack sizes, {summary.packSizesUpdated} pack sizes updated.
          {newCategories.length > 0 && ` New ${newCategories.length === 1 ? 'category' : 'categories'}: ${newCategories.join(', ')}.`}</span>
        <Link to="/admin/products">See products</Link>
      </div>
    );
  }
  if (!errorMessage) return null;
  return (
    <section className="card import-problems" role="alert">
      <header><h2>{problems.length > 0 ? `${problems.length} ${problems.length === 1 ? 'problem' : 'problems'} found · nothing was saved` : errorMessage}</h2>
        {problems.length > 0 && <span className="hint">Fix these rows and upload again</span>}</header>
      {problems.length > 0 && (
        <table className="admin-table"><tbody>
          {problems.map((problem, index) => <tr key={index}><td className="problem-row-number">{problem.rowNumber ? `Row ${problem.rowNumber}` : '—'}</td><td>{problem.message}</td></tr>)}
        </tbody></table>
      )}
    </section>
  );
}

const noResult = { summary: null, problems: [], errorMessage: null };

export function AdminBulkImportPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(noResult);

  async function chooseFile(chosen) {
    if (!chosen) return;
    const text = await chosen.text();
    setFile({ name: chosen.name, size: chosen.size, text, rowCount: rowCountOf(text) });
    setResult(noResult);
  }
  async function uploadFile() {
    setUploading(true);
    try {
      const response = await callApi('/api/admin/products/bulk-import', { method: 'POST', rawBody: file.text, contentType: 'text/csv' });
      setResult({ ...noResult, summary: response.summary });
    } catch (error) {
      setResult({ summary: null, problems: error.problems ?? [], errorMessage: error.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AdminPageHeader title="Bulk upload products" subtitle={<><Link to="/admin/products">Products</Link> / Add or update many products at once from a spreadsheet</>} />
      <div className="import-steps">
        <TemplateStep />
        <RulesStep />
        <UploadStep file={file} onFile={chooseFile} onClear={() => { setFile(null); setResult(noResult); }} uploading={uploading} onUpload={uploadFile} />
      </div>
      <ImportResult {...result} />
    </>
  );
}

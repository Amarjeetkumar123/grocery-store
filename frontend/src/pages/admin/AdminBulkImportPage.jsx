import { useState } from 'react';
import { Link } from 'react-router';
import { callApi } from '../../apiClient.js';
import { Icon } from '../../Icon.jsx';
import { AdminPageHeader } from './AdminLayout.jsx';

function ImportResult({ summary, problems, errorMessage }) {
  if (summary) {
    return (
      <p className="notice notice-success" role="status">
        <Icon name="check" /> Saved: {summary.productsCreated} new products, {summary.packSizesCreated} new pack sizes,
        {' '}{summary.packSizesUpdated} pack sizes updated. <Link to="/admin/products">See products</Link>
      </p>
    );
  }
  if (!errorMessage) return null;
  return (
    <div role="alert">
      <p className="error-text">{errorMessage}</p>
      {problems.length > 0 && (
        <table className="admin-table problem-table">
          <thead><tr><th>Row</th><th>Problem</th></tr></thead>
          <tbody>
            {problems.map((problem, index) => (
              <tr key={index}><td>{problem.rowNumber ?? '—'}</td><td>{problem.message}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function AdminBulkImportPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState({ summary: null, problems: [], errorMessage: null });

  async function uploadFile(event) {
    event.preventDefault();
    setUploading(true);
    try {
      const response = await callApi('/api/admin/products/bulk-import', { method: 'POST', rawBody: await file.text(), contentType: 'text/csv' });
      setResult({ summary: response.summary, problems: [], errorMessage: null });
    } catch (error) {
      setResult({ summary: null, problems: error.problems ?? [], errorMessage: error.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AdminPageHeader title="Bulk upload products"><Link to="/admin/products" className="text-button">Back to products</Link></AdminPageHeader>
      <form className="card form-section import-steps" onSubmit={uploadFile}>
        <p><strong>1.</strong> Download the template and fill it in Excel or Google Sheets. One row per pack size.</p>
        <a href="/product-upload-template.csv" download className="button button-outline button-compact align-start">Download template</a>
        <p><strong>2.</strong> Save it as <strong>CSV</strong> and choose the file. Rows for an existing product and pack size update its price and set its stock count.</p>
        <input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} aria-label="CSV file" />
        <button type="submit" className="button button-compact align-start" disabled={!file || uploading}>
          <Icon name="upload" /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <p className="hint">If any row has a problem, nothing is saved and every problem is listed below.</p>
      </form>
      <ImportResult {...result} />
    </>
  );
}

import React, { useRef, useState } from 'react';
import '../styles/components.css';

export default function UploadZone({ file, csvData, columns, onFileSelect }) {
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  };

  return (
    <div
      className={`upload-zone ${drag ? 'drag-over' : ''}`}
      onClick={() => fileInputRef.current.click()}
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
    >
      <input ref={fileInputRef} type="file" accept=".csv" style={{display:'none'}}
        onChange={e => onFileSelect(e.target.files[0])}/>
      <div className="upload-icon">📊</div>
      <h3>{file ? 'Click to change file' : 'Drop your CSV here'}</h3>
      <p>{file ? '' : 'or click to browse — CSV files only'}</p>
      {file && csvData && (
        <div className="upload-file-name">
          ✓ {file.name} · {csvData.length.toLocaleString()} rows · {columns.length} cols
        </div>
      )}
    </div>
  );
}
import { useCallback, useRef, useState } from 'react';
import { ACCEPTED_UPLOAD_TYPES } from '../lib/pdf';

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onFileSelected, disabled }: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition ${
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
          : dragOver
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_UPLOAD_TYPES}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-lg font-medium text-slate-700">
        PDF oder Bild hier ablegen
      </p>
      <p className="mt-2 text-sm text-slate-500">
        oder klicken zum Auswählen · PDF, JPG, PNG, WebP
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Gescannte PDFs ohne Text? → Seite als Foto hochladen
      </p>
    </div>
  );
}

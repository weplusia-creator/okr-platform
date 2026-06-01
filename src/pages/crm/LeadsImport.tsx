import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle,
  FileText, X, Loader2, Users, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { toast } from '../../components/ui/toast';
import type { Lead, LeadSource } from '../../types/crm';
import { LEAD_SOURCE_LABELS } from '../../types/crm';

// ----- CSV parser (handles quotes / commas / newlines) ------------------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === ',' || ch === ';' || ch === '\t') {
      cur.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      // CRLF or LF
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      cur.push(cell);
      cell = '';
      if (cur.some((c) => c.trim() !== '')) rows.push(cur);
      cur = [];
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  // last cell / row
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    if (cur.some((c) => c.trim() !== '')) rows.push(cur);
  }
  return rows;
}

// ----- Field map --------------------------------------------------------

type TargetField =
  | 'skip'
  | 'contactName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'company'
  | 'position'
  | 'igUsername'
  | 'manychatId'
  | 'notes';

const TARGET_LABEL: Record<TargetField, string> = {
  skip: '— No importar —',
  contactName: 'Nombre completo (contactName)',
  firstName: 'Nombre (parte del contactName)',
  lastName: 'Apellido (parte del contactName)',
  email: 'Email',
  phone: 'Teléfono',
  company: 'Empresa',
  position: 'Cargo / posición',
  igUsername: 'Instagram username → notes',
  manychatId: 'ManyChat ID → notes',
  notes: 'Notas',
};

const AUTO_DETECT: Record<string, TargetField> = {
  // ManyChat IG/Messenger typical headers
  'first name': 'firstName', 'first_name': 'firstName', 'firstname': 'firstName',
  'nombre': 'firstName',
  'last name': 'lastName', 'last_name': 'lastName', 'lastname': 'lastName',
  'apellido': 'lastName',
  'name': 'contactName', 'full name': 'contactName', 'fullname': 'contactName',
  'email': 'email', 'mail': 'email', 'correo': 'email',
  'phone': 'phone', 'whatsapp': 'phone', 'telefono': 'phone', 'teléfono': 'phone', 'celular': 'phone',
  'company': 'company', 'empresa': 'company',
  'position': 'position', 'cargo': 'position', 'puesto': 'position',
  'ig_username': 'igUsername', 'instagram': 'igUsername', 'ig username': 'igUsername',
  'subscriber_id': 'manychatId', 'subscriber id': 'manychatId',
  'manychat_id': 'manychatId', 'subscriberid': 'manychatId',
  'notes': 'notes', 'notas': 'notes', 'tags': 'notes',
};

// ----- Component --------------------------------------------------------

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done';

export function LeadsImport() {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { leads: existingLeads, fetchLeads, addLead } = useCRM();

  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, TargetField>>({});
  const [source, setSource] = useState<LeadSource>('otro');
  const [dedupe, setDedupe] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');

  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, created: 0, skipped: 0, errors: 0 });

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const existingEmails = useMemo(
    () => new Set(existingLeads.map((l) => (l.email || '').toLowerCase()).filter(Boolean)),
    [existingLeads],
  );
  const existingPhones = useMemo(
    () => new Set(existingLeads.map((l) => (l.phone || '').replace(/\s+/g, '')).filter(Boolean)),
    [existingLeads],
  );

  // ----- Step 1: Upload -----

  const handleFile = (file: File) => {
    setParseError(null);
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (>10 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      consumeCsv(text);
    };
    reader.onerror = () => toast.error('No se pudo leer el archivo.');
    reader.readAsText(file, 'utf-8');
  };

  const consumeCsv = (text: string) => {
    try {
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setParseError('El CSV no tiene filas de datos (solo encabezado o vacío).');
        return;
      }
      const hdrs = parsed[0].map((h) => h.trim());
      const dataRows = parsed.slice(1);
      setHeaders(hdrs);
      setRows(dataRows);
      // Auto-detect mapping
      const auto: Record<number, TargetField> = {};
      hdrs.forEach((h, i) => {
        const k = h.toLowerCase().trim();
        auto[i] = AUTO_DETECT[k] || 'skip';
      });
      setMapping(auto);
      setStep('map');
    } catch (err: any) {
      setParseError('No se pudo parsear el CSV: ' + (err?.message || 'error desconocido'));
    }
  };

  // ----- Step 2: Mapping validation -----

  const hasNameMapping = useMemo(() => {
    return Object.values(mapping).some(
      (v) => v === 'contactName' || v === 'firstName' || v === 'lastName',
    );
  }, [mapping]);

  // ----- Step 3: Preview / Build leads -----

  const buildLeadFromRow = (row: string[]): Omit<Lead, 'id' | 'organizationId' | 'createdAt' | 'updatedAt' | 'score'> | null => {
    let firstName = '';
    let lastName = '';
    let contactName = '';
    let email: string | null = null;
    let phone: string | null = null;
    let company: string | null = null;
    let position: string | null = null;
    let igUsername = '';
    let manychatId = '';
    let extraNotes = '';

    headers.forEach((_, i) => {
      const target = mapping[i] || 'skip';
      const val = (row[i] ?? '').trim();
      if (!val) return;
      switch (target) {
        case 'firstName': firstName = val; break;
        case 'lastName': lastName = val; break;
        case 'contactName': contactName = val; break;
        case 'email': email = val; break;
        case 'phone': phone = val.replace(/[^\d+\s\-()]/g, ''); break;
        case 'company': company = val; break;
        case 'position': position = val; break;
        case 'igUsername': igUsername = val.replace(/^@/, ''); break;
        case 'manychatId': manychatId = val; break;
        case 'notes': extraNotes = val; break;
      }
    });

    const finalName = contactName || [firstName, lastName].filter(Boolean).join(' ').trim();
    if (!finalName) return null;

    const notesParts: string[] = [];
    if (igUsername) notesParts.push(`Instagram: @${igUsername}`);
    if (manychatId) notesParts.push(`ManyChat ID: ${manychatId}`);
    if (extraNotes) notesParts.push(extraNotes);
    const notes = notesParts.length > 0 ? notesParts.join('\n') : null;

    return {
      contactName: finalName,
      company,
      email,
      phone,
      position,
      source,
      status: 'nuevo' as const,
      budgetRange: null,
      timeline: null,
      needs: null,
      notes,
      ownerId: appUser?.id ?? null,
      convertedAt: null,
      convertedToDealId: null,
      lastContactAt: null,
      nextContactAt: null,
    };
  };

  const previewLeads = useMemo(
    () => rows.slice(0, 5).map((r) => buildLeadFromRow(r)).filter(Boolean) as ReturnType<typeof buildLeadFromRow>[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, mapping, source, appUser?.id],
  );

  const validLeadsCount = useMemo(() => {
    let count = 0;
    for (const r of rows) {
      const l = buildLeadFromRow(r);
      if (l) count++;
    }
    return count;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping, source, appUser?.id]);

  // ----- Step 4: Import -----

  const runImport = async () => {
    if (!appUser?.id) {
      toast.error('No se detectó el usuario. Recargá la página.');
      return;
    }
    setStep('importing');
    let created = 0, skipped = 0, errors = 0;
    setImportProgress({ done: 0, total: rows.length, created, skipped, errors });

    for (let i = 0; i < rows.length; i++) {
      const lead = buildLeadFromRow(rows[i]);
      if (!lead) { skipped++; setImportProgress({ done: i + 1, total: rows.length, created, skipped, errors }); continue; }
      if (dedupe) {
        const emailKey = (lead.email || '').toLowerCase();
        const phoneKey = (lead.phone || '').replace(/\s+/g, '');
        if ((emailKey && existingEmails.has(emailKey)) || (phoneKey && existingPhones.has(phoneKey))) {
          skipped++;
          setImportProgress({ done: i + 1, total: rows.length, created, skipped, errors });
          continue;
        }
        if (emailKey) existingEmails.add(emailKey);
        if (phoneKey) existingPhones.add(phoneKey);
      }
      try {
        const res = await addLead(lead);
        if (res) created++;
        else errors++;
      } catch {
        errors++;
      }
      setImportProgress({ done: i + 1, total: rows.length, created, skipped, errors });
    }

    setStep('done');
    toast.success(`Importación finalizada: ${created} creados, ${skipped} saltados, ${errors} errores`);
  };

  // ----- Render -----

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/crm/leads')}
          className="p-1.5 -m-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-accent-600 dark:text-accent-400" />
            Importar leads desde CSV
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Subí el export de ManyChat (o cualquier CSV) y mapeá las columnas a campos de Lead.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <StepDot active={step === 'upload'} done={step !== 'upload'} label="1. Subir" />
        <ArrowRight className="w-3 h-3 opacity-50" />
        <StepDot active={step === 'map'} done={['preview', 'importing', 'done'].includes(step)} label="2. Mapear columnas" />
        <ArrowRight className="w-3 h-3 opacity-50" />
        <StepDot active={step === 'preview'} done={['importing', 'done'].includes(step)} label="3. Preview" />
        <ArrowRight className="w-3 h-3 opacity-50" />
        <StepDot active={step === 'importing' || step === 'done'} done={step === 'done'} label="4. Importar" />
      </div>

      {/* === Step 1: Upload === */}
      {step === 'upload' && (
        <div className="card p-5 sm:p-6 space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 dark:border-[#443f40] rounded-xl p-8 text-center hover:border-[#3100E2] dark:hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Hacé click o arrastrá un archivo CSV acá
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Acepta separadores coma, punto-y-coma o tab. Hasta 10 MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          <div className="text-center text-xs text-gray-400 dark:text-gray-500">— o pegá el contenido directo —</div>

          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Pegá acá el contenido del CSV (incluyendo la fila de encabezados)..."
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3100E2]"
          />

          {pasteText.trim() && (
            <button
              type="button"
              onClick={() => consumeCsv(pasteText)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#3100E2] text-white text-sm font-semibold hover:bg-[#2300a3] transition-colors"
            >
              Parsear texto pegado
            </button>
          )}

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FF4632]/10 text-[#FF4632] text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <strong>Tip ManyChat IG/Messenger:</strong> en tu dashboard de ManyChat → Audience → click en
            los 3 puntos arriba a la derecha → Export Subscribers → CSV. Vas a tener columnas como
            <code className="px-1 mx-1 rounded bg-gray-100 dark:bg-[#363233]">first_name</code>,
            <code className="px-1 mx-1 rounded bg-gray-100 dark:bg-[#363233]">last_name</code>,
            <code className="px-1 mx-1 rounded bg-gray-100 dark:bg-[#363233]">ig_username</code>,
            <code className="px-1 mx-1 rounded bg-gray-100 dark:bg-[#363233]">subscriber_id</code>.
            El importer las detecta solo.
          </div>
        </div>
      )}

      {/* === Step 2: Map === */}
      {step === 'map' && (
        <div className="card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Detectadas {headers.length} columnas y {rows.length} filas de datos
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Asigná cada columna a un campo de Lead. Las marcadas "— No importar —" se ignoran.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setStep('upload'); setHeaders([]); setRows([]); }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Empezar de nuevo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#443f40] text-left">
                  <th className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-200">Columna CSV</th>
                  <th className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-200">Mapear a</th>
                  <th className="py-2 font-medium text-gray-700 dark:text-gray-200">Ejemplo (fila 1)</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((h, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-[#363233]">
                    <td className="py-2 pr-4 font-mono text-xs text-gray-900 dark:text-white">{h || `(col ${i + 1})`}</td>
                    <td className="py-2 pr-4">
                      <select
                        value={mapping[i] || 'skip'}
                        onChange={(e) => setMapping((m) => ({ ...m, [i]: e.target.value as TargetField }))}
                        className="px-2 py-1 rounded border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#3100E2]"
                      >
                        {(Object.keys(TARGET_LABEL) as TargetField[]).map((t) => (
                          <option key={t} value={t}>{TARGET_LABEL[t]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {rows[0]?.[i] ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-[#443f40]">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Origen (source)</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-[#443f40] bg-white dark:bg-[#2e2a2b] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#3100E2]"
              >
                {(Object.keys(LEAD_SOURCE_LABELS) as LeadSource[]).map((s) => (
                  <option key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dedupe}
                  onChange={(e) => setDedupe(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-[#3100E2] focus:ring-[#3100E2]"
                />
                Saltar duplicados (mismo email o teléfono)
              </label>
            </div>
          </div>

          {!hasNameMapping && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Necesitás mapear al menos una columna a <strong>Nombre</strong>, <strong>Nombre completo</strong> o <strong>Apellido</strong>.</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={!hasNameMapping}
              onClick={() => setStep('preview')}
              className="px-4 py-2 rounded-lg bg-[#3100E2] text-white text-sm font-semibold hover:bg-[#2300a3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuar a preview
            </button>
          </div>
        </div>
      )}

      {/* === Step 3: Preview === */}
      {step === 'preview' && (
        <div className="card p-5 sm:p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {validLeadsCount} de {rows.length} filas se importarán
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Las filas sin nombre válido se saltean. {dedupe ? 'Duplicados (por email o teléfono) también se saltean.' : ''}
            </p>
          </div>

          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 -mb-2">Preview (primeras 5):</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#443f40] text-left">
                  <th className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-200">Nombre</th>
                  <th className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-200">Email</th>
                  <th className="py-2 pr-4 font-medium text-gray-700 dark:text-gray-200">Teléfono</th>
                  <th className="py-2 font-medium text-gray-700 dark:text-gray-200">Notas</th>
                </tr>
              </thead>
              <tbody>
                {previewLeads.map((l, i) => l && (
                  <tr key={i} className="border-b border-gray-100 dark:border-[#363233]">
                    <td className="py-1.5 pr-4 text-gray-900 dark:text-white">{l.contactName}</td>
                    <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">{l.email || '—'}</td>
                    <td className="py-1.5 pr-4 text-gray-500 dark:text-gray-400">{l.phone || '—'}</td>
                    <td className="py-1.5 text-gray-500 dark:text-gray-400 whitespace-pre-wrap max-w-xs truncate">{l.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep('map')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={runImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3100E2] text-white text-sm font-semibold hover:bg-[#2300a3] transition-colors"
            >
              <Users className="w-4 h-4" />
              Importar {validLeadsCount} leads
            </button>
          </div>
        </div>
      )}

      {/* === Step 4: Importing === */}
      {step === 'importing' && (
        <div className="card p-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 mx-auto text-[#3100E2] animate-spin" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            Importando... {importProgress.done} de {importProgress.total}
          </p>
          <div className="max-w-md mx-auto bg-gray-200 dark:bg-[#363233] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#3100E2] h-full transition-all"
              style={{ width: `${importProgress.total > 0 ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Creados: {importProgress.created} · Saltados: {importProgress.skipped} · Errores: {importProgress.errors}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">No cierres esta pestaña.</p>
        </div>
      )}

      {/* === Done === */}
      {step === 'done' && (
        <div className="card p-8 text-center space-y-4">
          {importProgress.errors === 0 ? (
            <Sparkles className="w-12 h-12 mx-auto text-emerald-500" />
          ) : (
            <CheckCircle2 className="w-12 h-12 mx-auto text-amber-500" />
          )}
          <p className="text-lg font-bold text-gray-900 dark:text-white">Importación lista 🎉</p>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            <div className="card p-3 bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{importProgress.created}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Creados</p>
            </div>
            <div className="card p-3 bg-gray-200/40 dark:bg-[#363233]">
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{importProgress.skipped}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Saltados</p>
            </div>
            <div className="card p-3 bg-[#FF4632]/10">
              <p className="text-2xl font-bold text-[#FF4632]">{importProgress.errors}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Errores</p>
            </div>
          </div>
          <div className="flex justify-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => navigate('/crm/leads')}
              className="px-4 py-2 rounded-lg bg-[#3100E2] text-white text-sm font-semibold hover:bg-[#2300a3] transition-colors inline-flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              Ver leads
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('upload');
                setHeaders([]);
                setRows([]);
                setPasteText('');
                setImportProgress({ done: 0, total: 0, created: 0, skipped: 0, errors: 0 });
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3839] transition-colors"
            >
              Importar otro CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${active ? 'font-semibold text-[#3100E2] dark:text-blue-400' : done ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : (
        <span className={`w-3.5 h-3.5 rounded-full border ${active ? 'bg-[#3100E2] border-[#3100E2]' : 'border-gray-300 dark:border-gray-600'}`} />
      )}
      {label}
    </span>
  );
}

import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, ChevronDown, Copy, Check } from 'lucide-react';
import { useArca } from '../../context/ArcaContext';

interface CertificateUploadProps {
  cuitId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CertificateUpload({ cuitId, onClose, onSuccess }: CertificateUploadProps) {
  const { uploadCertificate } = useArca();
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showGuide, setShowGuide] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<number | null>(null);

  const certInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const copyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(idx);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleUpload = async () => {
    if (!certFile || !keyFile) {
      setError('Debes seleccionar ambos archivos: certificado y clave privada.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const result = await uploadCertificate(cuitId, certFile, keyFile);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError('Error al subir el certificado. Verifica que los archivos sean correctos.');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al subir el certificado.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Subir Certificado Digital
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 mx-auto text-success-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              Certificado subido exitosamente
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Guide toggle */}
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg text-sm text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            >
              <span className="font-medium">
                {showGuide ? 'Ocultar instrucciones' : 'No tengo certificado. Ver instrucciones'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
            </button>

            {showGuide && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4 text-sm">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Paso 1: Generar la clave privada y el CSR
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Abrí una terminal en tu computadora y ejecutá estos dos comandos:
                </p>
                {[
                  'openssl genrsa -out MiClave.key 2048',
                  'openssl req -new -key MiClave.key -subj "/C=AR/O=MI_EMPRESA/CN=MI_NOMBRE/serialNumber=CUIT 20XXXXXXXX0" -out MiCSR.csr',
                ].map((cmd, i) => (
                  <div key={i} className="relative group">
                    <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 pr-12 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                      {cmd}
                    </pre>
                    <button
                      onClick={() => copyCommand(cmd, i)}
                      className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
                      title="Copiar"
                    >
                      {copiedCmd === i ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Reemplazá <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">MI_EMPRESA</code>, <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">MI_NOMBRE</code> y <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">20XXXXXXXX0</code> con tus datos reales.
                </p>

                <hr className="border-gray-200 dark:border-gray-700" />

                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Paso 2: Subir el CSR a ARCA/AFIP
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
                  <li>
                    Ingresá a{' '}
                    <a
                      href="https://auth.afip.gob.ar/contribuyente/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      AFIP con clave fiscal
                    </a>
                  </li>
                  <li>Buscá el servicio <strong>Administracion de Certificados Digitales</strong></li>
                  <li>Si no lo tenés habilitado, agregalo desde <strong>Administrador de Relaciones de Clave Fiscal</strong></li>
                  <li>Dentro del servicio, hacé click en <strong>Agregar nuevo certificado</strong></li>
                  <li>Ponele un nombre (ej: "WAU Platform") y subí el archivo <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">MiCSR.csr</code></li>
                  <li>Una vez creado, seleccioná el certificado y hacé click en <strong>Agregar alias/DN del servicio</strong></li>
                  <li>Asocialo al servicio <strong>wsfe (Facturacion Electronica)</strong></li>
                  <li>Descargá el archivo <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.crt</code> que genera ARCA</li>
                </ol>

                <hr className="border-gray-200 dark:border-gray-700" />

                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Paso 3: Subir a la plataforma
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  <li><strong>Certificado (.crt)</strong>: el archivo que descargaste de ARCA</li>
                  <li><strong>Clave Privada (.key)</strong>: el archivo <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">MiClave.key</code> que generaste en el paso 1</li>
                </ul>
              </div>
            )}

            {/* Certificate file */}
            <div>
              <label className="label">Certificado (.crt, .pem)</label>
              <input
                ref={certInputRef}
                type="file"
                accept=".crt,.pem"
                onChange={(e) => {
                  setCertFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="hidden"
              />
              <div
                onClick={() => certInputRef.current?.click()}
                className="input cursor-pointer flex items-center gap-3 text-gray-500"
              >
                <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="truncate">
                  {certFile ? certFile.name : 'Seleccionar archivo de certificado...'}
                </span>
              </div>
            </div>

            {/* Private key file */}
            <div>
              <label className="label">Clave Privada (.key, .pem)</label>
              <input
                ref={keyInputRef}
                type="file"
                accept=".key,.pem"
                onChange={(e) => {
                  setKeyFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="hidden"
              />
              <div
                onClick={() => keyInputRef.current?.click()}
                className="input cursor-pointer flex items-center gap-3 text-gray-500"
              >
                <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="truncate">
                  {keyFile ? keyFile.name : 'Seleccionar archivo de clave privada...'}
                </span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-danger-700 dark:text-danger-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary" disabled={uploading}>
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                className="btn-primary"
                disabled={uploading || !certFile || !keyFile}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir Certificado
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

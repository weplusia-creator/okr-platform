import { CheckCircle, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useRef } from 'react';

interface CaeDisplayProps {
  cae: string;
  caeVencimiento: string;
  cuit: string;
  puntoVenta: number;
  tipoComprobante: number;
  numeroComprobante: number;
  total: number;
  fecha: string;
}

export function CaeDisplay({
  cae,
  caeVencimiento,
  cuit,
  puntoVenta,
  tipoComprobante,
  numeroComprobante,
  total,
  fecha,
}: CaeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Build the QR data following ARCA/AFIP QR spec
  const qrData = (() => {
    const payload = {
      ver: 1,
      fecha,
      cuit: Number(cuit.replace(/\D/g, '')),
      ptoVta: puntoVenta,
      tipoCmp: tipoComprobante,
      nroCmp: numeroComprobante,
      importe: total,
      moneda: 'PES',
      ctz: 1,
      tipoCodAut: 'E',
      codAut: Number(cae),
    };

    const jsonStr = JSON.stringify(payload);
    const base64 = btoa(jsonStr);
    return `https://www.afip.gob.ar/fe/qr/?p=${base64}`;
  })();

  const formatVencimiento = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDownloadQR = useCallback(() => {
    if (!qrRef.current) return;

    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

    // Convert SVG to canvas for PNG download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `qr-cae-${cae}.png`;
        link.href = pngUrl;
        link.click();
      }
    };

    img.src = URL.createObjectURL(svgBlob);
  }, [cae]);

  return (
    <div className="card border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
            Comprobante Autorizado
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400">
            ARCA ha autorizado este comprobante electr{'\u00F3'}nico
          </p>
        </div>
      </div>

      {/* CAE Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              C{'\u00F3'}digo de Autorizaci{'\u00F3'}n Electr{'\u00F3'}nico (CAE)
            </p>
            <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
              {cae}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Fecha de Vencimiento CAE
            </p>
            <p className="text-base font-medium text-gray-900 dark:text-white">
              {formatVencimiento(caeVencimiento)}
            </p>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 flex flex-col items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          C{'\u00F3'}digo QR del Comprobante
        </p>
        <div ref={qrRef} className="p-3 bg-white rounded-lg">
          <QRCodeSVG
            value={qrData}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>
        <button
          onClick={handleDownloadQR}
          className="btn-secondary mt-4"
        >
          <Download className="w-4 h-4" />
          Descargar QR
        </button>
      </div>
    </div>
  );
}

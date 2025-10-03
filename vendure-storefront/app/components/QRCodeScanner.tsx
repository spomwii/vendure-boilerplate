import { useState } from 'react';
import QrReader from 'react-qr-scanner';

interface QRCodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: Error) => void;
}

export function QRCodeScanner({ onScan, onError }: QRCodeScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (data: string | null) => {
    if (data) {
      onScan(data);
    }
  };

  const handleError = (err: Error) => {
    setError(err.message);
    onError?.(err);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative">
        <QrReader
          delay={300}
          onError={handleError}
          onScan={handleScan}
          style={{
            width: '100%',
            height: '300px',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        />
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Position the QR code within the frame to scan
        </p>
      </div>
    </div>
  );
}

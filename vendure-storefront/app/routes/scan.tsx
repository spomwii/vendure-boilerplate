import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { QRCodeScanner } from '~/components/QRCodeScanner';

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Reset error state on mount
    setError(null);
  }, []);

  const handleScan = (result: string) => {
    console.log('QR Code scanned:', result);
    
    // Extract door ID from the scanned result
    // Assuming the QR code contains a URL like: /door/123
    const doorMatch = result.match(/\/door\/(\d+)/);
    if (doorMatch) {
      const doorId = doorMatch[1];
      navigate(`/door/${doorId}`);
    } else {
      // If it's just a door number
      const doorNumber = result.replace(/\D/g, '');
      if (doorNumber) {
        navigate(`/door/${doorNumber}`);
      } else {
        alert('Invalid QR code. Please scan a valid door QR code.');
        setIsScanning(false);
        setTimeout(() => setIsScanning(true), 1000);
      }
    }
  };

  const handleError = (error: Error) => {
    console.error('QR Scanner error:', error);
    setError(`Scanner error: ${error.message}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Scan QR Code
          </h1>
          <p className="text-gray-600">
            Point your camera at the QR code on the vending machine door
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsScanning(true);
              }}
              className="mt-2 text-sm text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        )}

        {isScanning && !error && (
          <QRCodeScanner
            onScan={handleScan}
            onError={handleError}
          />
        )}

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

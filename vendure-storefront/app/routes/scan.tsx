import { useState } from 'react';
import { useNavigate } from '@remix-run/react';
import { QRCodeScanner } from '~/components/QRCodeScanner';

export default function ScanPage() {
  const [isScanning, setIsScanning] = useState(true);
  const navigate = useNavigate();

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

        {isScanning && (
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

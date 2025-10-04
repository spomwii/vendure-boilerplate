// QR Code Generator for Vending Machine Doors
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function QRGenerator() {
  const [selectedDoor, setSelectedDoor] = useState(1);
  const [qrDataUrls, setQrDataUrls] = useState<Record<number, string>>({});
  
  const doors = Array.from({ length: 8 }, (_, i) => i + 1);
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://vendure-storefront-production-1708.up.railway.app'
    : 'http://localhost:3000';

  const generateQRCode = (doorNumber: number) => {
    const doorUrl = `${baseUrl}/door/${doorNumber}`;
    return doorUrl;
  };

  const generateQRDataUrl = async (doorNumber: number) => {
    try {
      const url = generateQRCode(doorNumber);
      const dataUrl = await QRCode.toDataURL(url, { width: 256 });
      setQrDataUrls(prev => ({ ...prev, [doorNumber]: dataUrl }));
      return dataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  const downloadQRCode = (doorNumber: number) => {
    const dataUrl = qrDataUrls[doorNumber];
    if (dataUrl) {
      const downloadLink = document.createElement('a');
      downloadLink.download = `door-${doorNumber}-qr.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
    }
  };

  // Generate QR codes for all doors on component mount
  useEffect(() => {
    doors.forEach(door => {
      generateQRDataUrl(door);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Vending Machine QR Code Generator
          </h1>
          <p className="text-gray-600">
            Generate QR codes for each door. Print these and attach to the corresponding doors.
          </p>
        </div>

        {/* Door Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Select Door</h2>
          <div className="grid grid-cols-4 gap-4">
            {doors.map((door) => (
              <button
                key={door}
                onClick={() => setSelectedDoor(door)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  selectedDoor === door
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Door {door}
              </button>
            ))}
          </div>
        </div>

        {/* QR Code Display */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">QR Code for Door {selectedDoor}</h2>
            <button
              onClick={() => downloadQRCode(selectedDoor)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Download PNG
            </button>
          </div>
          
          <div className="flex flex-col items-center">
            <div id={`qr-${selectedDoor}`} className="p-4 bg-white border-2 border-gray-200 rounded-lg">
              {qrDataUrls[selectedDoor] ? (
                <img 
                  src={qrDataUrls[selectedDoor]} 
                  alt={`QR Code for Door ${selectedDoor}`}
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-500">
                  Generating QR Code...
                </div>
              )}
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">URL:</p>
              <code className="bg-gray-100 px-3 py-1 rounded text-sm break-all">
                {generateQRCode(selectedDoor)}
              </code>
            </div>
          </div>
        </div>

        {/* All QR Codes Grid */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">All Door QR Codes</h2>
          <div className="grid grid-cols-4 gap-6">
            {doors.map((door) => (
              <div key={door} className="bg-white rounded-lg shadow p-4 text-center">
                <h3 className="font-medium mb-2">Door {door}</h3>
                <div className="mb-2">
                  {qrDataUrls[door] ? (
                    <img 
                      src={qrDataUrls[door]} 
                      alt={`QR Code for Door ${door}`}
                      className="w-32 h-32 mx-auto"
                    />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center text-gray-500 text-xs">
                      Generating...
                    </div>
                  )}
                </div>
                <button
                  onClick={() => downloadQRCode(door)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// QR Code Generator for Vending Machine Doors
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRGenerator() {
  const [selectedDoor, setSelectedDoor] = useState(1);
  
  const doors = Array.from({ length: 8 }, (_, i) => i + 1);
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://vendure-storefront-production-1708.up.railway.app'
    : 'http://localhost:3000';

  const generateQRCode = (doorNumber: number) => {
    const doorUrl = `${baseUrl}/door/${doorNumber}`;
    return doorUrl;
  };

  const downloadQRCode = (doorNumber: number) => {
    const svg = document.getElementById(`qr-${doorNumber}`)?.querySelector('svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `door-${doorNumber}-qr.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

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
              <QRCodeSVG
                value={generateQRCode(selectedDoor)}
                size={256}
                level="M"
                includeMargin={true}
              />
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
                  <QRCodeSVG
                    value={generateQRCode(door)}
                    size={128}
                    level="M"
                    includeMargin={true}
                  />
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

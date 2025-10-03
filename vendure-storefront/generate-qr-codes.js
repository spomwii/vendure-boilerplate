// QR Code Generator for Vending Machine Doors
// Run with: node generate-qr-codes.js

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Your storefront URL (replace with your actual Railway URL)
const STOREFRONT_URL = 'https://vendure-storefront-production-1708.up.railway.app';

// Generate QR codes for doors 1-8
async function generateQRCodes() {
  const qrDir = path.join(__dirname, 'qr-codes');
  
  // Create qr-codes directory if it doesn't exist
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir);
  }

  for (let door = 1; door <= 8; door++) {
    const url = `${STOREFRONT_URL}/door/${door}`;
    const filename = path.join(qrDir, `door-${door}.png`);
    
    try {
      await QRCode.toFile(filename, url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      console.log(`✅ Generated QR code for Door ${door}: ${filename}`);
      console.log(`   URL: ${url}`);
    } catch (error) {
      console.error(`❌ Error generating QR code for Door ${door}:`, error);
    }
  }
  
  console.log('\n🎉 All QR codes generated!');
  console.log('📁 QR codes saved in: qr-codes/ directory');
  console.log('\n📋 Next steps:');
  console.log('1. Print the QR codes and attach them to your vending machine doors');
  console.log('2. Make sure your Vendure backend has products with SKUs: SKU-DOOR1, SKU-DOOR2, etc.');
  console.log('3. Test by scanning a QR code with your mobile phone');
}

generateQRCodes().catch(console.error);

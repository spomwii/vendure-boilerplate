# 🚀 Vending Machine System Setup Guide

## Overview
This guide will help you set up a complete vending machine system using Vendure, ESP32, and MQTT.

## System Architecture
```
Mobile Phone → QR Scan → Storefront → Payment → MQTT → ESP32 → Door Opens
```

## Step 1: Configure Vendure Backend Products

### 1.1 Add Products in Vendure Admin
1. Go to your Vendure Admin panel (usually `your-backend-url/admin`)
2. Navigate to **Catalog** → **Products**
3. Create 8 products with these exact SKUs:
   - Product 1: SKU = `SKU-DOOR1`
   - Product 2: SKU = `SKU-DOOR2`
   - Product 3: SKU = `SKU-DOOR3`
   - Product 4: SKU = `SKU-DOOR4`
   - Product 5: SKU = `SKU-DOOR5`
   - Product 6: SKU = `SKU-DOOR6`
   - Product 7: SKU = `SKU-DOOR7`
   - Product 8: SKU = `SKU-DOOR8`

### 1.2 Product Configuration
- Set appropriate prices for each product
- Add product images
- Ensure products are **active** and **published**
- Set stock levels as needed

## Step 2: Configure Railway Environment Variables

### 2.1 Storefront Environment Variables
In your Railway `vendure-storefront` service, add:
```
VENDING_SERVICE_URL=https://your-vending-service-url.up.railway.app
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 2.2 Vending Service Environment Variables
In your Railway `vendure-vending-service` service, add:
```
MQTT_HOST=b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=your_hivemq_username
MQTT_PASSWORD=your_hivemq_password
MQTT_TLS=true
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=5m
SENDGRID_API_KEY=your_sendgrid_key (optional)
FROM_EMAIL=no-reply@yourdomain.com
PORT=4000
```

## Step 3: Generate QR Codes

### 3.1 Install QR Code Generator
```bash
cd vendure-storefront
npm install qrcode
```

### 3.2 Generate QR Codes
```bash
node generate-qr-codes.js
```

This will create QR codes in the `qr-codes/` directory for all 8 doors.

### 3.3 Print and Attach QR Codes
- Print each QR code
- Attach them to the corresponding vending machine doors
- Each QR code links to: `https://your-storefront-url.up.railway.app/door/{doorNumber}`

## Step 4: Configure ESP32

### 4.1 Update ESP32 Code
Update the ESP32 Arduino code with your credentials:
```cpp
const char* WIFI_SSID = "your_wifi_name";
const char* WIFI_PASS = "your_wifi_password";
const char* MQTT_HOST = "b99daae87ec445fc8d048c084732a6ca.s1.eu.hivemq.cloud";
const char* MQTT_USER = "your_hivemq_username";
const char* MQTT_PASS = "your_hivemq_password";
const char* DEVICE_ID = "esp-test-1";
```

### 4.2 Pin Configuration
The ESP32 code is configured for:
- **8 Output Pins** (door control): 25, 27, 12, 2, 4, 18, 21, 23
- **8 Input Pins** (door sensors): 32, 26, 14, 13, 15, 5, 19, 22

## Step 5: Test the Complete Workflow

### 5.1 Test QR Code Scanning
1. Open your mobile phone camera
2. Scan the QR code on door 1
3. You should be redirected to: `your-storefront-url/door/1`
4. The product should be automatically added to checkout
5. You should see the simplified vending checkout page

### 5.2 Test Payment Flow
1. Enter optional email for receipt
2. Click "Proceed to Payment"
3. Complete Stripe payment
4. After successful payment, the door should unlock

### 5.3 Monitor MQTT Activity
- Check HiveMQ web client for MQTT messages
- You should see unlock commands and door events
- ESP32 should receive unlock commands and open the door

## Step 6: Troubleshooting

### Common Issues:

#### "No matching order found" Error
- **Cause**: Missing `VENDING_SERVICE_URL` environment variable
- **Fix**: Add the environment variable in Railway storefront service

#### No MQTT Activity
- **Cause**: Incorrect MQTT credentials or network issues
- **Fix**: Verify MQTT credentials in vending service environment variables

#### QR Code Not Working
- **Cause**: Incorrect storefront URL in QR codes
- **Fix**: Update `STOREFRONT_URL` in `generate-qr-codes.js` and regenerate

#### Door Not Opening
- **Cause**: ESP32 not receiving MQTT commands
- **Fix**: Check ESP32 WiFi connection and MQTT credentials

## Step 7: Production Deployment

### 7.1 Security Considerations
- Use strong JWT secrets
- Enable proper MQTT authentication
- Use HTTPS for all services
- Implement proper error handling

### 7.2 Monitoring
- Set up logging for all services
- Monitor MQTT message flow
- Track payment success/failure rates
- Monitor door opening events

## Expected Workflow

1. **Customer scans QR code** → Redirected to `/door/{doorNumber}`
2. **Product automatically added** → SKU mapped to door number
3. **Simplified checkout** → Only email (optional) required
4. **Stripe payment** → Secure payment processing
5. **Door unlocks** → ESP32 receives MQTT command
6. **Customer takes product** → Door sensor detects opening
7. **Receipt sent** → Email confirmation (if provided)

## Support

If you encounter issues:
1. Check Railway logs for all services
2. Verify environment variables are set correctly
3. Test MQTT connectivity using HiveMQ web client
4. Ensure ESP32 is connected to WiFi and MQTT broker
5. Verify products exist in Vendure with correct SKUs

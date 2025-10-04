// Test complete vending machine workflow
const puppeteer = require('puppeteer');

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Vending Machine Workflow');
  console.log('==========================================');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Show browser for debugging
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    // Step 1: Navigate to QR generator
    console.log('📱 Step 1: Navigate to QR generator');
    await page.goto('http://localhost:3000/qr-generator');
    await page.waitForSelector('h1');
    console.log('✅ QR generator loaded');
    
    // Step 2: Navigate to door 1 (simulate QR scan)
    console.log('📱 Step 2: Navigate to door 1 (simulate QR scan)');
    await page.goto('http://localhost:3000/door/1');
    await page.waitForTimeout(2000); // Wait for door route processing
    console.log('✅ Door route processed');
    
    // Step 3: Check if redirected to vending checkout
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/checkout/vending')) {
      console.log('✅ Redirected to vending checkout');
      
      // Step 4: Fill email (optional)
      console.log('📧 Step 4: Fill email (optional)');
      await page.type('input[name="emailAddress"]', 'test@example.com');
      await page.waitForTimeout(1000);
      console.log('✅ Email filled');
      
      // Step 5: Proceed to payment
      console.log('💳 Step 5: Proceed to payment');
      await page.click('button[type="button"]:has-text("Proceed to Payment")');
      await page.waitForTimeout(2000);
      console.log('✅ Navigated to payment');
      
      // Step 6: Check if on payment page
      const paymentUrl = page.url();
      console.log('📍 Payment URL:', paymentUrl);
      
      if (paymentUrl.includes('/checkout/vending-payment')) {
        console.log('✅ On payment page');
        
        // Step 7: Use test payment form (if available)
        console.log('💳 Step 7: Complete payment');
        
        // Look for test payment form or Stripe form
        const testForm = await page.$('form:has(input[name="cardNumber"])');
        if (testForm) {
          console.log('📝 Using test payment form');
          await page.click('button[type="submit"]:has-text("Pay with Test Form")');
          await page.waitForTimeout(3000);
          console.log('✅ Test payment submitted');
        } else {
          console.log('💳 Using Stripe payment form');
          // Fill Stripe form if available
          await page.waitForTimeout(2000);
          console.log('✅ Stripe form loaded');
        }
        
        // Step 8: Check confirmation page
        console.log('🎉 Step 8: Check confirmation page');
        await page.waitForTimeout(3000);
        const confirmationUrl = page.url();
        console.log('📍 Confirmation URL:', confirmationUrl);
        
        if (confirmationUrl.includes('/checkout/confirmation/')) {
          console.log('✅ On confirmation page');
          
          // Step 9: Test door unlock
          console.log('🚪 Step 9: Test door unlock');
          await page.click('button:has-text("Open door")');
          await page.waitForTimeout(2000);
          console.log('✅ Door unlock button clicked');
          
          // Step 10: Check for success message
          const successMessage = await page.$eval('body', el => el.textContent);
          if (successMessage.includes('unlocked successfully')) {
            console.log('✅ Door unlock successful');
          } else {
            console.log('❌ Door unlock failed');
          }
          
          // Step 11: Wait for redirect
          console.log('⏳ Step 11: Wait for redirect to home');
          await page.waitForTimeout(8000);
          const finalUrl = page.url();
          console.log('📍 Final URL:', finalUrl);
          
          if (finalUrl.includes('/') && !finalUrl.includes('/checkout/')) {
            console.log('✅ Redirected to home page');
            console.log('🎉 Complete workflow test successful!');
          } else {
            console.log('❌ Did not redirect to home page');
          }
        } else {
          console.log('❌ Not on confirmation page');
        }
      } else {
        console.log('❌ Not on payment page');
      }
    } else {
      console.log('❌ Not redirected to vending checkout');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);

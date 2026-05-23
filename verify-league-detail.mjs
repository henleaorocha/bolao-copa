import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set mobile viewport (375px)
  await page.setViewportSize({ width: 375, height: 812 });
  
  try {
    // Navigate to the app
    console.log('📱 Testing on 375px mobile viewport...\n');
    
    // Try to access the leagues page
    const response = await page.goto('http://localhost:3000/ligas', { 
      waitUntil: 'load',
      timeout: 10000 
    });
    
    console.log(`✓ Page loaded with status: ${response?.status()}`);
    
    // Wait for content to appear
    await page.waitForLoadState('domcontentloaded');
    
    // Take a screenshot
    await page.screenshot({ path: '/tmp/league-detail-mobile.png' });
    console.log('✓ Screenshot saved\n');
    
    // Check page content
    const content = await page.content();
    console.log('📋 Page Analysis:');
    console.log(`  ${content.includes('Ligas') ? '✓' : '✗'} Contains "Ligas" text`);
    console.log(`  ${content.includes('Voltar') ? '✓' : '✗'} Has navigation elements`);
    console.log(`  ${content.includes('Convidar') ? '✓' : '✗'} Has Invite button`);
    console.log(`  ${content.includes('Membros') ? '✓' : '✗'} Has Members section`);
    console.log(`  ${content.includes('Configurações') ? '✓' : '✗'} Has Settings button (admin)`);
    
  } catch (error) {
    console.error('⚠️  Error:', error.message);
  } finally {
    await browser.close();
  }
})();

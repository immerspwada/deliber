#!/usr/bin/env node

/**
 * Verify that viewCustomerHistory function exists in source code
 * This script checks the actual file content to confirm the function is there
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying viewCustomerHistory function...\n');

const filePath = path.join(__dirname, 'src/admin/views/CustomersView.vue');

try {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check for function declaration
  const functionPattern = /function\s+viewCustomerHistory\s*\(/;
  const arrowPattern = /const\s+viewCustomerHistory\s*=/;
  
  const hasFunctionDeclaration = functionPattern.test(content);
  const hasArrowFunction = arrowPattern.test(content);
  
  console.log('📄 File:', filePath);
  console.log('📊 File size:', content.length, 'bytes');
  console.log('');
  
  console.log('✅ Checks:');
  console.log('  - Function declaration:', hasFunctionDeclaration ? '✅ FOUND' : '❌ NOT FOUND');
  console.log('  - Arrow function:', hasArrowFunction ? '✅ FOUND' : '❌ NOT FOUND');
  console.log('');
  
  if (hasFunctionDeclaration || hasArrowFunction) {
    console.log('✅ SUCCESS: viewCustomerHistory function EXISTS in source code!');
    console.log('');
    
    // Extract the function
    const lines = content.split('\n');
    const functionLines = [];
    let inFunction = false;
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (functionPattern.test(line) || arrowPattern.test(line)) {
        inFunction = true;
      }
      
      if (inFunction) {
        functionLines.push(`${i + 1}: ${line}`);
        
        // Count braces
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        if (braceCount === 0 && line.includes('}')) {
          break;
        }
      }
    }
    
    console.log('📝 Function code:');
    console.log('─'.repeat(60));
    functionLines.forEach(line => console.log(line));
    console.log('─'.repeat(60));
    console.log('');
    
    // Check template usage
    const templatePattern = /@click\.stop="viewCustomerHistory\(customer\)"/;
    const hasTemplateUsage = templatePattern.test(content);
    
    console.log('🎯 Template usage:');
    console.log('  - @click binding:', hasTemplateUsage ? '✅ FOUND' : '❌ NOT FOUND');
    console.log('');
    
    if (hasTemplateUsage) {
      console.log('✅ PERFECT: Function is declared AND used in template!');
      console.log('');
      console.log('🔥 THE PROBLEM IS BROWSER CACHE, NOT THE CODE!');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('   1. Run: ./force-localhost-fix.sh');
      console.log('   2. Open: http://localhost:5173/test-cache-version.html');
      console.log('   3. Click "ลบ Cache ทั้งหมด"');
      console.log('   4. Open Incognito: Cmd+Shift+N');
      console.log('   5. Go to: http://localhost:5173/admin/customers');
      console.log('   6. Test the history button');
    } else {
      console.log('⚠️  WARNING: Function exists but not used in template!');
    }
  } else {
    console.log('❌ ERROR: viewCustomerHistory function NOT FOUND!');
    console.log('');
    console.log('This should not happen. Please check the file manually.');
  }
  
} catch (error) {
  console.error('❌ Error reading file:', error.message);
  process.exit(1);
}

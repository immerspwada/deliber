#!/usr/bin/env node
/**
 * Secret Detection Script
 * Checks staged files for potential secrets/credentials
 * Used by lint-staged and pre-commit hooks
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, basename } from 'path'

// Patterns that indicate potential secrets
const SECRET_PATTERNS = [
  // Supabase/JWT tokens
  { pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, name: 'JWT Token' },
  
  // API Keys (generic)
  { pattern: /['"]?api[_-]?key['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/gi, name: 'API Key' },
  
  // Secret keys
  { pattern: /['"]?secret[_-]?key['"]?\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/gi, name: 'Secret Key' },
  
  // Private keys
  { pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, name: 'Private Key' },
  
  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key' },
  
  // Generic passwords in code
  { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/gi, name: 'Hardcoded Password' },
  
  // Supabase anon key assignment (not in .env)
  { pattern: /supabaseAnonKey\s*=\s*['"]eyJ/g, name: 'Hardcoded Supabase Key' },
]

// Files/patterns to skip
const SKIP_PATTERNS = [
  /\.env$/,
  /\.env\..+$/,
  /\.example$/,
  /node_modules/,
  /dist\//,
  /\.git\//,
  /check-secrets\.js$/, // Skip this file itself
]

// Check if file should be skipped
function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => pattern.test(filePath))
}

// Check a single file for secrets
function checkFile(filePath) {
  if (shouldSkip(filePath)) {
    return []
  }

  const absolutePath = resolve(process.cwd(), filePath)
  
  if (!existsSync(absolutePath)) {
    return []
  }

  let content
  try {
    content = readFileSync(absolutePath, 'utf-8')
  } catch (err) {
    console.warn(`Warning: Could not read ${filePath}`)
    return []
  }

  const findings = []

  for (const { pattern, name } of SECRET_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0
    
    const matches = content.match(pattern)
    if (matches) {
      findings.push({
        file: filePath,
        type: name,
        count: matches.length,
        preview: matches[0].substring(0, 50) + (matches[0].length > 50 ? '...' : '')
      })
    }
  }

  return findings
}

// Main execution
function main() {
  const args = process.argv.slice(2)
  
  // If no files provided, check common source directories
  const filesToCheck = args.length > 0 
    ? args 
    : ['src/lib/supabase.ts', 'src/stores/auth.ts']

  let allFindings = []

  for (const file of filesToCheck) {
    const findings = checkFile(file)
    allFindings = allFindings.concat(findings)
  }

  if (allFindings.length > 0) {
    console.error('\n🚨 POTENTIAL SECRETS DETECTED!\n')
    
    for (const finding of allFindings) {
      console.error(`  ❌ ${finding.type} in ${finding.file}`)
      console.error(`     Preview: ${finding.preview}\n`)
    }

    console.error('Please remove credentials and use environment variables instead.')
    console.error('If this is a false positive, you can:')
    console.error('  1. Add the pattern to SKIP_PATTERNS in check-secrets.js')
    console.error('  2. Use: git commit --no-verify (not recommended)\n')
    
    process.exit(1)
  }

  console.log('✅ No secrets detected')
  process.exit(0)
}

main()

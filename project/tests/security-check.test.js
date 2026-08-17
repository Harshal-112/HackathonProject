import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

function scanDirectoryForForbiddenStrings(dirPath, forbiddenRegex, extensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html']) {
  const violations = []

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir)
    for (const file of files) {
      const fullPath = path.join(currentDir, file)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
          walk(fullPath)
        }
      } else {
        const ext = path.extname(file)
        if (extensions.includes(ext)) {
          const content = fs.readFileSync(fullPath, 'utf8')
          if (forbiddenRegex.test(content)) {
            violations.push(fullPath)
          }
        }
      }
    }
  }

  walk(dirPath)
  return violations
}

describe('Static Security & Secret Leak Prevention Tests', () => {
  it('ensures VITE_GEMINI_API_KEY is not referenced anywhere in the frontend codebase (src/)', () => {
    const srcDir = path.resolve(__dirname, '../src')
    const forbiddenPattern = /VITE_GEMINI_API_KEY/

    const violations = scanDirectoryForForbiddenStrings(srcDir, forbiddenPattern)
    expect(violations).toEqual([])
  })

  it('ensures no hardcoded Google AI keys (AIza... or AQ...) exist in frontend source files', () => {
    const srcDir = path.resolve(__dirname, '../src')
    // Patterns matching Google API key formats
    const keyPattern = /(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{40,})/

    const violations = scanDirectoryForForbiddenStrings(srcDir, keyPattern)
    expect(violations).toEqual([])
  })

  it('ensures environment example files do not contain real API secrets', () => {
    const rootEnvExample = path.resolve(__dirname, '../.env.example')
    const projectEnvExample = path.resolve(__dirname, '../project/.env.example')

    const files = [rootEnvExample, projectEnvExample]
    for (const file of files) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8')
        expect(content).not.toContain('AIza')
        expect(content).not.toContain('AQ.')
        expect(content).not.toContain('VITE_GEMINI_API_KEY')
      }
    }
  })
})

import { describe, it, expect } from 'vitest'
import { generateCSV } from '@/backend/utils/csv'

describe('generateCSV', () => {
  it('generates basic CSV with headers and rows', () => {
    const csv = generateCSV(
      ['Name', 'Email'],
      [
        ['Alice', 'alice@example.com'],
        ['Bob', 'bob@example.com'],
      ],
    )
    expect(csv).toBe(
      '\uFEFFName,Email\nAlice,alice@example.com\nBob,bob@example.com',
    )
  })

  it('includes UTF-8 BOM prefix', () => {
    const csv = generateCSV(['A'], [['1']])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('returns just headers when rows are empty', () => {
    const csv = generateCSV(['Name', 'Email'], [])
    expect(csv).toBe('\uFEFFName,Email')
  })

  it('quotes values containing commas', () => {
    const csv = generateCSV(['Name'], [['Doe, Jane']])
    expect(csv).toBe('\uFEFFName\n"Doe, Jane"')
  })

  it('escapes double quotes with double-double quotes', () => {
    const csv = generateCSV(['Quote'], [['She said "hello"']])
    expect(csv).toBe('\uFEFFQuote\n"She said ""hello"""')
  })

  it('quotes values containing newlines', () => {
    const csv = generateCSV(['Note'], [['line1\nline2']])
    expect(csv).toBe('\uFEFFNote\n"line1\nline2"')
  })

  it('quotes values containing carriage returns', () => {
    const csv = generateCSV(['Note'], [['line1\r\nline2']])
    expect(csv).toBe('\uFEFFNote\n"line1\r\nline2"')
  })

  it('handles headers that need escaping', () => {
    const csv = generateCSV(['Name, Full', 'Email'], [['Alice', 'a@b.com']])
    expect(csv).toBe('\uFEFF"Name, Full",Email\nAlice,a@b.com')
  })

  it('handles mixed escaped and unescaped values in a row', () => {
    const csv = generateCSV(
      ['Name', 'Address', 'Phone'],
      [['Alice', '123 Main St, Apt 4', '555-1234']],
    )
    expect(csv).toBe(
      '\uFEFFName,Address,Phone\nAlice,"123 Main St, Apt 4",555-1234',
    )
  })

  it('handles empty string values', () => {
    const csv = generateCSV(['A', 'B'], [['', 'value']])
    expect(csv).toBe('\uFEFFA,B\n,value')
  })

  it('handles value with both commas and quotes', () => {
    const csv = generateCSV(['Data'], [['He said, "hi"']])
    expect(csv).toBe('\uFEFFData\n"He said, ""hi"""')
  })
})

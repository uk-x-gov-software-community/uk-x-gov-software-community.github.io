import { describe, it, expect } from 'vitest'
import {
  validateRequired,
  validateLink,
  buildIssueTitle,
  formatIssueBody,
  buildDispatchPayload,
  parseDeviceCodeResponse,
  isMemberResponse
} from '../assets/newsletter-submit.js'

describe('validateRequired', () => {
  it('returns true for a non-empty string', () => {
    expect(validateRequired('Alice')).toBe(true)
  })
  it('returns true for a string with only internal spaces', () => {
    expect(validateRequired('Cabinet Office')).toBe(true)
  })
  it('returns false for an empty string', () => {
    expect(validateRequired('')).toBe(false)
  })
  it('returns false for a whitespace-only string', () => {
    expect(validateRequired('   ')).toBe(false)
  })
  it('returns false for undefined', () => {
    expect(validateRequired(undefined)).toBe(false)
  })
})

describe('validateLink', () => {
  it('accepts an empty string (field is optional)', () => {
    expect(validateLink('')).toBe(true)
  })
  it('accepts a whitespace-only string', () => {
    expect(validateLink('   ')).toBe(true)
  })
  it('accepts a valid https URL', () => {
    expect(validateLink('https://example.gov.uk/blog')).toBe(true)
  })
  it('accepts a valid http URL', () => {
    expect(validateLink('http://example.gov.uk')).toBe(true)
  })
  it('rejects a non-URL string', () => {
    expect(validateLink('not a url')).toBe(false)
  })
  it('rejects an ftp URL (non-http/https protocol)', () => {
    expect(validateLink('ftp://example.com/file')).toBe(false)
  })
})

describe('buildIssueTitle', () => {
  it('formats a Date object as an ISO date', () => {
    expect(buildIssueTitle(new Date('2026-03-23T00:00:00Z'))).toBe('Newsletter Submission \u2013 2026-03-23')
  })
  it('formats an ISO date string', () => {
    expect(buildIssueTitle('2025-01-15T00:00:00Z')).toBe('Newsletter Submission \u2013 2025-01-15')
  })
})

describe('formatIssueBody', () => {
  it('includes all provided fields in the output', () => {
    const body = formatIssueBody({
      name: 'Alice',
      department: 'Cabinet Office',
      story: 'We shipped a thing',
      link: 'https://example.gov.uk',
      github_username: 'alice',
      submitted_at: '2026-03-23'
    })
    expect(body).toContain('### Name\nAlice')
    expect(body).toContain('### Department / Organisation\nCabinet Office')
    expect(body).toContain('### Story / Update\nWe shipped a thing')
    expect(body).toContain('### Link\nhttps://example.gov.uk')
    expect(body).toContain('@alice')
    expect(body).toContain('2026-03-23')
  })

  it('uses "(not provided)" for empty fields', () => {
    const body = formatIssueBody({
      name: '',
      department: '',
      story: '',
      link: '',
      github_username: 'bob',
      submitted_at: '2026-03-23'
    })
    expect(body).toContain('### Name\n(not provided)')
    expect(body).toContain('### Department / Organisation\n(not provided)')
    expect(body).toContain('### Story / Update\n(not provided)')
    expect(body).toContain('### Link\n(not provided)')
  })

  it('trims leading and trailing whitespace from fields', () => {
    const body = formatIssueBody({
      name: '  Alice  ',
      department: '  Cabinet Office  ',
      story: '  a story  ',
      link: '  https://example.gov.uk  ',
      github_username: 'alice',
      submitted_at: '2026-03-23'
    })
    expect(body).toContain('### Name\nAlice')
    expect(body).toContain('### Department / Organisation\nCabinet Office')
    expect(body).toContain('### Story / Update\na story')
    expect(body).toContain('### Link\nhttps://example.gov.uk')
  })

  it('stores user input as-is (GitHub renders Markdown safely)', () => {
    const body = formatIssueBody({
      name: '<script>alert(1)</script>',
      department: 'HMRC',
      story: '',
      link: '',
      github_username: 'eve',
      submitted_at: '2026-03-23'
    })
    expect(body).toContain('<script>alert(1)</script>')
  })
})

describe('buildDispatchPayload', () => {
  it('returns the expected shape with all fields provided', () => {
    const payload = buildDispatchPayload(
      { name: 'Alice', department: 'Cabinet Office', story: 'A story', link: 'https://example.gov.uk' },
      'alice',
      '2026-03-23'
    )
    expect(payload).toEqual({
      name: 'Alice',
      department: 'Cabinet Office',
      story: 'A story',
      link: 'https://example.gov.uk',
      github_username: 'alice',
      submitted_at: '2026-03-23'
    })
  })

  it('trims whitespace from all form fields', () => {
    const payload = buildDispatchPayload(
      { name: '  Alice  ', department: '  Cabinet Office  ', story: '  story  ', link: '  https://x.gov.uk  ' },
      'alice',
      '2026-03-23'
    )
    expect(payload.name).toBe('Alice')
    expect(payload.department).toBe('Cabinet Office')
    expect(payload.story).toBe('story')
    expect(payload.link).toBe('https://x.gov.uk')
  })

  it('defaults missing fields to empty string', () => {
    const payload = buildDispatchPayload({}, 'alice', '2026-03-23')
    expect(payload.name).toBe('')
    expect(payload.department).toBe('')
    expect(payload.story).toBe('')
    expect(payload.link).toBe('')
  })
})

describe('parseDeviceCodeResponse', () => {
  const valid = {
    device_code: 'abc123',
    user_code: 'ABCD-EFGH',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 5
  }

  it('returns all parsed fields for a valid response', () => {
    expect(parseDeviceCodeResponse(valid)).toEqual(valid)
  })

  it('throws if device_code is missing', () => {
    const incomplete = { ...valid }
    delete incomplete.device_code
    expect(() => parseDeviceCodeResponse(incomplete)).toThrow('device_code')
  })

  it('throws if user_code is missing', () => {
    const incomplete = { ...valid }
    delete incomplete.user_code
    expect(() => parseDeviceCodeResponse(incomplete)).toThrow('user_code')
  })

  it('throws if interval is missing', () => {
    const incomplete = { ...valid }
    delete incomplete.interval
    expect(() => parseDeviceCodeResponse(incomplete)).toThrow('interval')
  })
})

describe('isMemberResponse', () => {
  it('returns true for HTTP 204 (member)', () => {
    expect(isMemberResponse(204)).toBe(true)
  })

  it('returns false for HTTP 404 (not a member)', () => {
    expect(isMemberResponse(404)).toBe(false)
  })

  it('returns false for HTTP 302 (requester is not themselves a member)', () => {
    expect(isMemberResponse(302)).toBe(false)
  })

  it('throws for unexpected status codes', () => {
    expect(() => isMemberResponse(500)).toThrow('500')
    expect(() => isMemberResponse(401)).toThrow('401')
  })
})

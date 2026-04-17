// ─── Configuration ─────────────────────────────────────────────────────────
// TODO: Fill in after registering the GitHub OAuth App in the org
const GITHUB_CLIENT_ID = 'YOUR_OAUTH_APP_CLIENT_ID'
// TODO: Fill in after deploying the Cloudflare Worker (see cloudflare-worker/)
const CORS_PROXY = 'YOUR_CLOUDFLARE_WORKER_URL'

const ORG = 'uk-x-gov-software-community'
const SITE_REPO = 'uk-x-gov-software-community.github.io'
const OAUTH_SCOPE = 'read:org public_repo'

// ─── Pure utility functions (exported for testing) ──────────────────────────

/**
 * Validates that a required field is not empty or blank.
 * @param {string} value
 * @returns {boolean}
 */
export function validateRequired(value) {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Validates a URL string. Empty/blank string is treated as valid (field is optional).
 * Only http: and https: protocols are accepted.
 * @param {string} url
 * @returns {boolean}
 */
export function validateLink(url) {
  if (!url || url.trim() === '') return true
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Builds a GitHub issue title for a newsletter submission.
 * @param {Date|string} date
 * @returns {string}
 */
export function buildIssueTitle(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `Newsletter Submission \u2013 ${d.toISOString().slice(0, 10)}`
}

/**
 * Formats the GitHub issue body markdown from submission data.
 * @param {{ name: string, department: string, story: string, link: string, github_username: string, submitted_at: string }} data
 * @returns {string}
 */
export function formatIssueBody({ name, department, story, link, github_username, submitted_at }) {
  const safe = (v) => (v && v.trim()) ? v.trim() : '(not provided)'
  return [
    '## Newsletter Submission',
    '',
    `**Submitted by:** @${github_username} on ${submitted_at}`,
    '',
    '### Name',
    safe(name),
    '',
    '### Department / Organisation',
    safe(department),
    '',
    '### Story / Update',
    safe(story),
    '',
    '### Link',
    safe(link),
    '',
    '---',
    '*Submitted via https://uk-x-gov-software-community.github.io/newsletter-submit/*'
  ].join('\n')
}

/**
 * Builds the client_payload object for the repository_dispatch event.
 * @param {{ name?: string, department?: string, story?: string, link?: string }} formData
 * @param {string} github_username
 * @param {string} submitted_at  ISO date string (YYYY-MM-DD)
 * @returns {{ name: string, department: string, story: string, link: string, github_username: string, submitted_at: string }}
 */
export function buildDispatchPayload(formData, github_username, submitted_at) {
  return {
    name: (formData.name || '').trim(),
    department: (formData.department || '').trim(),
    story: (formData.story || '').trim(),
    link: (formData.link || '').trim(),
    github_username,
    submitted_at
  }
}

/**
 * Parses the JSON response from the GitHub Device Flow /login/device/code endpoint.
 * Throws if any required field is missing.
 * @param {object} json
 * @returns {{ device_code: string, user_code: string, verification_uri: string, expires_in: number, interval: number }}
 */
export function parseDeviceCodeResponse(json) {
  const required = ['device_code', 'user_code', 'verification_uri', 'expires_in', 'interval']
  for (const key of required) {
    if (json[key] === undefined || json[key] === null) {
      throw new Error(`Missing field in device code response: ${key}`)
    }
  }
  return {
    device_code: json.device_code,
    user_code: json.user_code,
    verification_uri: json.verification_uri,
    expires_in: json.expires_in,
    interval: json.interval
  }
}

/**
 * Interprets the HTTP status from a GitHub org membership check.
 * 204 = member, 404/302 = not a member, anything else throws.
 * @param {number} status
 * @returns {boolean}
 */
export function isMemberResponse(status) {
  if (status === 204) return true
  if (status === 404 || status === 302) return false
  throw new Error(`Unexpected membership check status: ${status}`)
}

// ─── Browser-only progressive enhancement ───────────────────────────────────

if (typeof document !== 'undefined') {
  initForm()
}

function initForm() {
  const form = document.getElementById('newsletter-form')
  const authPanel = document.getElementById('auth-panel')
  const userCodeEl = document.getElementById('user-code')
  const authStatus = document.getElementById('auth-status')
  const confirmationPanel = document.getElementById('confirmation-panel')
  const errorSummary = document.getElementById('error-summary')
  const errorList = document.getElementById('error-list')
  const nameInput = document.getElementById('name')
  const departmentInput = document.getElementById('department')
  const linkInput = document.getElementById('link')

  if (!form) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    clearErrors()

    let hasErrors = false

    const nameValue = nameInput ? nameInput.value : ''
    if (!validateRequired(nameValue)) {
      showFieldError('name-group', 'name', null, 'Enter your name')
      hasErrors = true
    }

    const departmentValue = departmentInput ? departmentInput.value : ''
    if (!validateRequired(departmentValue)) {
      showFieldError('department-group', 'department', null, 'Enter your department or organisation')
      hasErrors = true
    }

    const linkValue = linkInput ? linkInput.value : ''
    if (!validateLink(linkValue)) {
      showFieldError('link-group', 'link', 'link-hint', 'Enter a valid URL, for example https://example.gov.uk')
      hasErrors = true
    }

    if (hasErrors) return

    form.hidden = true
    authPanel.hidden = false
    authStatus.textContent = 'Requesting authorisation code from GitHub\u2026'

    let deviceData
    try {
      deviceData = await requestDeviceCode()
    } catch (err) {
      showTopError(`Could not start GitHub authorisation: ${err.message}`)
      form.hidden = false
      authPanel.hidden = true
      return
    }

    userCodeEl.textContent = deviceData.user_code
    window.open('https://github.com/login/device', '_blank', 'noopener,noreferrer')
    authStatus.textContent = 'Waiting for you to authorise on GitHub\u2026'

    let token
    try {
      token = await pollForToken(deviceData.device_code, deviceData.interval, deviceData.expires_in)
    } catch (err) {
      showTopError(`Authorisation failed or timed out: ${err.message}`)
      form.hidden = false
      authPanel.hidden = true
      return
    }

    authStatus.textContent = 'Authorised. Verifying community membership\u2026'

    let username
    try {
      username = await getAuthenticatedUser(token)
    } catch {
      showTopError('Could not retrieve your GitHub username. Please try again.')
      form.hidden = false
      authPanel.hidden = true
      return
    }

    let memberStatus
    try {
      memberStatus = await checkOrgMembershipStatus(token, username)
    } catch (e) {
      showTopError(`Membership check failed: ${e.message}`)
      form.hidden = false
      authPanel.hidden = true
      return
    }

    let isMember
    try {
      isMember = isMemberResponse(memberStatus)
    } catch (err) {
      showTopError(`Membership check returned an unexpected response: ${err.message}`)
      form.hidden = false
      authPanel.hidden = true
      return
    }

    if (!isMember) {
      showTopError(
        'You do not appear to be a member of the uk-x-gov-software-community organisation on GitHub. ' +
        'Only community members can submit newsletter content.'
      )
      form.hidden = false
      authPanel.hidden = true
      return
    }

    authStatus.textContent = 'Membership confirmed. Submitting\u2026'

    const submittedAt = new Date().toISOString().slice(0, 10)
    const payload = buildDispatchPayload(
      {
        name: nameValue,
        department: departmentValue,
        story: document.getElementById('story') ? document.getElementById('story').value : '',
        link: linkValue
      },
      username,
      submittedAt
    )

    try {
      await fireDispatch(token, payload)
    } catch (err) {
      showTopError(`Submission failed: ${err.message}`)
      form.hidden = false
      authPanel.hidden = true
      return
    }

    authPanel.hidden = true
    confirmationPanel.hidden = false
    confirmationPanel.focus()
  })

  function clearErrors() {
    if (errorSummary) errorSummary.hidden = true
    if (errorList) errorList.innerHTML = ''
    for (const [groupId, input] of [
      ['name-group', nameInput],
      ['department-group', departmentInput],
      ['link-group', linkInput]
    ]) {
      const group = document.getElementById(groupId)
      if (group) {
        group.classList.remove('govuk-form-group--error')
        const existing = group.querySelector('.govuk-error-message')
        if (existing) existing.remove()
      }
      if (input) {
        input.classList.remove('govuk-input--error')
        input.removeAttribute('aria-describedby')
      }
    }
  }

  function showFieldError(groupId, inputId, hintId, message) {
    const group = document.getElementById(groupId)
    const input = document.getElementById(inputId)
    if (!group || !input) return

    group.classList.add('govuk-form-group--error')

    const errMsg = document.createElement('p')
    errMsg.className = 'govuk-error-message'
    errMsg.id = `${inputId}-error`
    errMsg.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${message}`
    const label = group.querySelector('label')
    if (label) label.after(errMsg)

    input.classList.add('govuk-input--error')
    const hint = document.getElementById(hintId)
    const describedBy = [hint ? hintId : null, `${inputId}-error`].filter(Boolean).join(' ')
    input.setAttribute('aria-describedby', describedBy)

    if (errorSummary && errorList) {
      const li = document.createElement('li')
      li.innerHTML = `<a href="#${inputId}">${message}</a>`
      errorList.appendChild(li)
      errorSummary.hidden = false
      errorSummary.focus()
    }
  }

  function showTopError(message) {
    if (errorSummary && errorList) {
      errorList.innerHTML = `<li>${message}</li>`
      errorSummary.hidden = false
      errorSummary.focus()
    }
    authPanel.hidden = true
    form.hidden = false
  }
}

async function requestDeviceCode() {
  const resp = await fetch(`${CORS_PROXY}/device/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: OAUTH_SCOPE })
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return parseDeviceCodeResponse(await resp.json())
}

function pollForToken(deviceCode, interval, expiresIn) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + expiresIn * 1000

    const poll = async () => {
      if (Date.now() > deadline) {
        reject(new Error('Authorisation timed out'))
        return
      }
      try {
        const resp = await fetch(`${CORS_PROXY}/oauth/access_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
          })
        })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        if (data.access_token) {
          resolve(data.access_token)
        } else if (data.error === 'authorization_pending' || data.error === 'slow_down') {
          const wait = data.error === 'slow_down' ? (interval + 5) * 1000 : interval * 1000
          setTimeout(poll, wait)
        } else {
          reject(new Error(data.error_description || data.error || 'Unknown error'))
        }
      } catch (err) {
        reject(err)
      }
    }

    setTimeout(poll, interval * 1000)
  })
}

async function getAuthenticatedUser(token) {
  const resp = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const data = await resp.json()
  return data.login
}

async function checkOrgMembershipStatus(token, username) {
  const resp = await fetch(
    `https://api.github.com/orgs/${ORG}/members/${encodeURIComponent(username)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      redirect: 'manual'
    }
  )
  return resp.status
}

async function fireDispatch(token, payload) {
  const resp = await fetch(
    `https://api.github.com/repos/${ORG}/${SITE_REPO}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify({ event_type: 'newsletter-submission', client_payload: payload })
    }
  )
  if (resp.status !== 204) throw new Error(`Dispatch returned HTTP ${resp.status}`)
}

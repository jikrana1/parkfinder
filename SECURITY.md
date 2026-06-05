# Security Policy

## Supported Versions

The following versions of **ParkFinder** are currently supported with security updates:

| Version | Supported |
| ------- | --------- |
| main    | ✅ Yes    |

## Recent Security Updates

### ✅ Issue #45: Hardcoded Secrets Vulnerability (RESOLVED)

**Description:** Hardcoded secret keys for JWT signing and admin creation bypass have been removed from the codebase.

**Status:** ✅ Fixed

**What Changed:**

- `JWT_SECRET` replaced with `process.env.JWT_SECRET` environment variable
- `ADMIN_SECRET` replaced with `process.env.ADMIN_SECRET` environment variable
- Added startup validation to prevent server startup if required environment variables are missing

**Affected Files Modified:**

- `server/controllers/auth.controller.js` - Line 16 (admin secret check), Line 51 (JWT signing)
- `server/middleware/auth.js` - Line 16 (JWT verification)
- `server/server.js` - Lines 15-27 (Environment variable validation added)
- `.env.example` - Created with documented required variables

**Action Required:**

1. Update your `.env` file with secure random values for `JWT_SECRET` and `ADMIN_SECRET`
2. Ensure `.env` is in `.gitignore` and never committed to version control
3. In production, set these variables through your hosting platform's environment configuration

## Environment Configuration

### Critical Security Variables

The following environment variables are **REQUIRED** for secure operation:

| Variable       | Purpose                                   | Min Length    |
| -------------- | ----------------------------------------- | ------------- |
| `JWT_SECRET`   | Sign and verify JWT authentication tokens | 32 characters |
| `ADMIN_SECRET` | Validate admin account creation requests  | 32 characters |

### Generating Secure Secrets

**On Linux/Mac:**

```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**

```powershell
[System.Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

### Local Setup Instructions

1. Copy the template:

   ```bash
   cp .env.example .env
   ```

2. Generate and add secure values:

   ```bash
   # Generate JWT_SECRET
   openssl rand -base64 32

   # Generate ADMIN_SECRET
   openssl rand -base64 32
   ```

3. Update `.env` with generated values and verify `.env` is in `.gitignore`

4. Start the server - it validates all required environment variables at startup:
   ```bash
   npm run dev
   ```

### Production Deployment

**For Render, Vercel, or similar platforms:**

- Do NOT include `.env` file in your repository
- Set environment variables directly in the platform's dashboard:
  - Navigate to Settings → Environment Variables
  - Add `JWT_SECRET` and `ADMIN_SECRET` with secure values
- The application validates these variables on startup and will fail with a clear error if missing

## Contact Details

To report a security vulnerability in **ParkFinder**, please reach out via:

- 👤 Maintainer: [imanchalsingh](https://github.com/imanchalsingh)
- 💬 Contact the maintainer through any social links listed on the GitHub profile

> Please **do not** open a public GitHub issue for security vulnerabilities.

## What to Include in Your Report

- A clear description of the vulnerability
- Steps to reproduce the issue
- Affected versions or components
- Potential impact assessment
- Any suggested fix (optional but appreciated)

## Expected Response Time

| Action                    | Timeframe       |
| ------------------------- | --------------- |
| Acknowledgement of report | Within 48 hours |
| Status update             | Within 7 days   |
| Patch / fix release       | Within 30 days  |

## Responsible Disclosure Policy

We follow a **responsible disclosure** policy:

- Please report vulnerabilities **privately** before any public disclosure
- We request an **embargo period of 30 days** to investigate and patch the issue
- After a fix is released, you are welcome to publish your findings
- We will credit reporters in the patch notes unless anonymity is requested
- We deeply appreciate the efforts of security researchers 🙏

## References

- [ParkFinder Repository](https://github.com/imanchalsingh/parkfinder)
- [GitHub Security Advisories Docs](https://docs.github.com/en/code-security/security-advisories)
- [Responsible Disclosure — OWASP](https://owasp.org/www-community/Vulnerability_Disclosure_Cheat_Sheet)
- [Adding a Security Policy to your repo](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)

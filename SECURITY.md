# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | ✅ Yes             |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

To report a security issue, email the maintainers directly at the address in the repository profile, or use GitHub's private security advisory feature:

1. Go to the **Security** tab on this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the details including steps to reproduce, potential impact, and any suggested fix.

You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 business days**.

## Security Model

This application implements the following security controls:

### Authentication & Authorization
- JWT-based authentication with configurable secret (minimum 32 characters enforced at startup).
- Strict Role-Based Access Control (RBAC): Student, Faculty, Admin verified from database records only.
- Client-supplied `role`, `user_id` or identity fields in request bodies are **ignored** — identity is derived exclusively from the verified JWT token.
- IDOR (Insecure Direct Object Reference) prevention: ownership checks on all user-scoped records.

### AI Safety
- All Gemini AI prompts are structured to reject prompt-injection attempts.
- Role-spoofing and privilege escalation are detected and blocked by the Central Kernel Engine.
- Sensitive data (grades, fees, attendance) is only available to the verified authenticated user.

### Infrastructure
- Helmet HTTP security headers enabled.
- CORS restricted to configured origins in production.
- Rate limiting on authentication and AI endpoints.
- All SQL queries use parameterized statements — no string interpolation.
- Input validation via Zod schemas on all POST/PUT routes.

## Responsible Disclosure

We follow a coordinated vulnerability disclosure process. Public disclosure is expected **90 days** after a fix has been shipped or after mutual agreement with the reporter.


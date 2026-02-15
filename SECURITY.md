# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in MCPX, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email: Create a private security advisory via [GitHub Security Advisories](https://github.com/TheoryofShadows/Mcp/security/advisories/new)
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- Acknowledgment within 48 hours
- Status update within 7 days
- Fix timeline shared once the issue is triaged

### Scope

The following are in scope:

- Authentication bypass or token forgery
- SQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Rate limit bypass
- Privilege escalation
- Sensitive data exposure

The following are out of scope:

- Denial of service (DoS) on demo instances
- Issues in dependencies with no practical exploit path
- Social engineering

## Security Measures

MCPX implements the following security controls:

| Control | Implementation |
|---------|---------------|
| Security headers | Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) |
| Rate limiting | 100 req/min global, 10 req/15min on auth |
| CORS | Origin whitelist with rejection of unauthorized origins |
| Authentication | JWT access tokens (15-min) + refresh tokens (30-day) |
| Password storage | bcrypt with 10 salt rounds (async) |
| SQL injection | Prepared statements on all queries |
| Input validation | Type checks, length limits, format validation |
| Error handling | Global error middleware, no stack traces in responses |

## Best Practices for Deployment

1. **Set `JWT_SECRET`** and **`REFRESH_SECRET`** to strong random values (32+ characters)
2. **Set `NODE_ENV=production`**
3. **Configure `CORS_ORIGINS`** to your actual domain only
4. **Run behind a reverse proxy** (nginx, Cloudflare) with TLS
5. **Keep dependencies updated** — run `npm audit` regularly

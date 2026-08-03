# FIMS Cloud Ver.3.6.3

## Nationwide calculation timeout fix

- Added an nginx timeout configuration for long-running nationwide calculations.
- Increased `proxy_read_timeout` and `proxy_send_timeout` to 30 minutes.
- Increased the browser calculation timeout to 35 minutes.
- Retained Selected Province and All Provinces calculation modes.
- Retained `Refresh Summary & Close`.
- No CORS headers are duplicated; successful FastAPI responses continue to use
  the existing application CORS configuration.

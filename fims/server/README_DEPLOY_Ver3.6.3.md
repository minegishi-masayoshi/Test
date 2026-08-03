# FIMS Cloud Ver.3.6.3 deployment

## Purpose

The nationwide endpoint can run longer than nginx's default proxy timeout.
A timeout causes nginx to return HTTP 504 before FastAPI finishes, which the
browser may display as both `Failed to fetch` and a CORS error.

Ver.3.6.3 raises nginx proxy timeouts to 30 minutes.

## Files to upload to `/home/ubuntu/`

- `constraint_api.py`
- `import_auto_api.py`
- `deploy_ver363.sh`
- `fims-api-timeouts.conf`

## Deploy

```bash
chmod +x /home/ubuntu/deploy_ver363.sh
/home/ubuntu/deploy_ver363.sh /home/ubuntu
```

The script:

1. backs up the current FastAPI modules;
2. updates and restarts `fims-api`;
3. installs `/etc/nginx/conf.d/fims-api-timeouts.conf`;
4. runs `nginx -t`;
5. reloads nginx without stopping the server.

## Timeout values

- Connect: 60 seconds
- Send: 1,800 seconds
- Read: 1,800 seconds
- General send timeout: 1,800 seconds

# FIMS Cloud Ver.3.6.2 deployment

Server files:

- `constraint_api.py`
- `import_auto_api.py`
- `deploy_ver362.sh`

Upload them to `/home/ubuntu/` and run:

```bash
chmod +x /home/ubuntu/deploy_ver362.sh
/home/ubuntu/deploy_ver362.sh /home/ubuntu
```

New endpoints:

- `POST /api/constraints/calculate/all`
- `GET /api/constraints/summary/all`

Existing Province endpoints remain available.

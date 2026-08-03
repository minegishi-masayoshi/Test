# FIMS Cloud Ver.3.6 deployment

Upload these three files to `/home/ubuntu/`:

- `import_auto_api.py`
- `constraint_api.py`
- `deploy_ver36.sh`

Then run:

```bash
cd /home/ubuntu
chmod +x deploy_ver36.sh
./deploy_ver36.sh /home/ubuntu
```

The script backs up `main.py` and the current import module, mounts the
constraint router once, validates Python syntax and restarts `fims-api`.

Endpoints:

- `POST /api/constraints/calculate/province/{province}`
- `GET /api/constraints/summary/province/{province}`

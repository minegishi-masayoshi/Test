# FIMS Cloud Ver.3.7 deployment

Ver.3.7 extends the existing Calculate operation with:

- FMU × Protected Area intersection
- FMU × Logged Not Land Use Current intersection
- FMU × Logged Land Use Current intersection
- FMU × Land Use Not Logged Current intersection
- Revised Gross Forest Area
- Revised Adjusted Forest Area
- Revised Gross Forest Volume

Upload `constraint_api.py`, `import_auto_api.py`, and `deploy_ver370.sh` to `/home/ubuntu/`, then run:

```bash
chmod +x /home/ubuntu/deploy_ver370.sh
/home/ubuntu/deploy_ver370.sh /home/ubuntu
```

The following PostGIS tables must exist before calculation:

- `protected_area`
- `logged_notlanduse_current`
- `logged_landuse_current`
- `landuse_notlogged_current`

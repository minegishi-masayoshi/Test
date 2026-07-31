# FIMS Cloud Ver.2.2.1

## Concession–FMU spatial classification fix

- Fixed the issue where every Concession in the same Province displayed the same FMU table.
- Replaced boundary-intersection matching with representative-point containment.
- FMUs are now assigned according to whether their polygon centroid or fallback sample points fall inside the selected Concession.
- This prevents adjacent FMUs that only touch a Concession boundary from being included.
- The selected Concession WMS filter now prefers `PLAN_ID` and falls back to `NAME`.
- Concession Summary continues to aggregate only the FMUs displayed for the selected Concession.

# FIMS Cloud Ver.3.8.1

## PDF library loading hotfix

- Replaced blocked jsDelivr script URLs with CSP-approved, version-pinned unpkg URLs.
- Uses jsPDF 2.5.1 and jsPDF-AutoTable 3.8.4.
- Kept `script-src 'self' https://unpkg.com` unchanged; no CSP relaxation was added.
- Added explicit checks for both jsPDF and AutoTable before report generation.
- Updated application cache-busting and displayed version to Ver.3.8.1.

## Browser update note

After uploading the files to GitHub Pages, use Ctrl+F5 once to clear the cached Ver.3.8.0 HTML and JavaScript.

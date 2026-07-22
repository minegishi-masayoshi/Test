/* =========================================================
   FIPS PDF Report
   jsPDF initialization test
========================================================= */

function checkPdfLibraries() {
  const jsPdfAvailable =
    Boolean(window.jspdf?.jsPDF);

  const autoTableAvailable =
    Boolean(
      window.jspdf?.jsPDF?.API?.autoTable
    );

  console.log("jsPDF available:", jsPdfAvailable);
  console.log(
    "AutoTable available:",
    autoTableAvailable
  );

  if (!jsPdfAvailable) {
    console.error(
      "jsPDF library was not loaded."
    );
    return;
  }

  if (!autoTableAvailable) {
    console.error(
      "jsPDF AutoTable was not loaded."
    );
    return;
  }

  console.log(
    "PDF libraries loaded successfully."
  );
}

checkPdfLibraries();

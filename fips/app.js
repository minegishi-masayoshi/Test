if (newSurveyForm) {
  newSurveyForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      survey_number: document.getElementById("surveyNumber").value.trim(),
      survey_name: document.getElementById("surveyName").value.trim(),
      survey_date: document.getElementById("surveyDate").value || null,
      province: document.getElementById("province").value.trim() || null,
      number_of_blocks: document.getElementById("numberOfBlocks").value
        ? Number(document.getElementById("numberOfBlocks").value)
        : null,
      gross_area_ha: document.getElementById("grossArea").value
        ? Number(document.getElementById("grossArea").value)
        : null,
      plan_id: document.getElementById("planId").value.trim() || null,
      survey_type: document.getElementById("surveyType").value || null,
      vegetation: document.getElementById("vegetation").value.trim() || null,
      slope_min: document.getElementById("slopeMin").value
        ? Number(document.getElementById("slopeMin").value)
        : null,
      slope_max: document.getElementById("slopeMax").value
        ? Number(document.getElementById("slopeMax").value)
        : null,
      elevation_min: document.getElementById("elevationMin").value
        ? Number(document.getElementById("elevationMin").value)
        : null,
      elevation_max: document.getElementById("elevationMax").value
        ? Number(document.getElementById("elevationMax").value)
        : null,
      adjusted_net_forest_area: document.getElementById("adjustedNetForestArea").value
        ? Number(document.getElementById("adjustedNetForestArea").value)
        : null
    };

    if (!payload.survey_number || !payload.survey_name) {
      showGenericError("Please enter the required fields.");
      return;
    }

    const { data, error } = await supabase
      .from("fips_surveys")
      .insert([payload])
      .select("id, survey_name")
      .single();

    if (error || !data) {
      showGenericError("Save failed.");
      return;
    }

    localStorage.setItem("currentSurveyId", data.id);
    localStorage.setItem("currentSurveyName", data.survey_name);

    alert("Saved successfully.");
    window.location.href = "./kobo-import.html";
  });
}

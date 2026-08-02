/**
 * FIMS Cloud Ver.3.0
 * GeoPackage import controller for the Large Map administrator workflow.
 */

import { CONFIG } from "./config.js";

const byId = (id) => document.getElementById(id);

const state = {
  busy: false
};

async function requestImport(url, options, timeout = 1800000) {
  const controller = new AbortController();
  const timer = window.setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    const response = await fetch(
      url,
      {
        ...options,
        signal: controller.signal,
        cache: "no-store"
      }
    );

    const raw = await response.text();
    let body = {};

    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {
        detail: raw
      };
    }

    if (!response.ok) {
      throw new Error(
        body.detail ||
        body.message ||
        `HTTP ${response.status}`
      );
    }

    return body;
  } finally {
    window.clearTimeout(timer);
  }
}

function setBusy(value) {
  state.busy = value;

  const executeButton =
    byId("executeImportButton");

  const closeButton =
    byId("closeImportDialogButton");

  const progress =
    byId("importProgress");

  if (executeButton) {
    executeButton.disabled = value;
  }

  if (closeButton) {
    closeButton.disabled = value;
  }

  if (progress) {
    progress.hidden = !value;
  }
}

function showResult(value, isError = false) {
  const result = byId("importResult");

  if (!result) {
    return;
  }

  result.hidden = false;
  result.classList.toggle(
    "error",
    isError
  );

  result.textContent =
    typeof value === "string"
      ? value
      : JSON.stringify(
          value,
          null,
          2
        );
}

function selectedTarget(config) {
  const select = byId("importTarget");
  const key = select?.value;

  return config.targets.find(
    (target) => target.key === key
  ) || null;
}

function updateSourceLayer(config) {
  const target =
    selectedTarget(config);

  const sourceInput =
    byId("importSourceLayer");

  if (sourceInput) {
    sourceInput.value =
      target?.sourceLayer ||
      target?.key ||
      "";
  }
}

function resetResult() {
  const result = byId("importResult");

  if (result) {
    result.hidden = true;
    result.textContent = "";
    result.classList.remove("error");
  }
}

/**
 * Initializes the Import modal.
 *
 * @param {(result: object, target: object) => Promise<void>|void} done
 */
export function initializeImport(
  done = () => {}
) {
  const config =
    CONFIG.dataImport;

  const modal =
    byId("importModal");

  const targetSelect =
    byId("importTarget");

  if (
    !config?.enabled ||
    !modal ||
    !targetSelect
  ) {
    return;
  }

  targetSelect.replaceChildren();

  for (const target of config.targets) {
    const option =
      document.createElement("option");

    option.value = target.key;
    option.textContent = target.label;

    targetSelect.append(option);
  }

  const modeSelect =
    byId("importMode");

  if (modeSelect) {
    modeSelect.value =
      config.defaultMode ||
      "replace";
  }

  updateSourceLayer(config);

  const close = () => {
    if (!state.busy) {
      modal.hidden = true;
    }
  };

  byId("importButton").onclick = () => {
    resetResult();
    updateSourceLayer(config);
    modal.hidden = false;
  };

  byId(
    "closeImportDialogButton"
  ).onclick = close;

  modal
    .querySelectorAll(
      "[data-import-close]"
    )
    .forEach(
      (element) => {
        element.onclick = close;
      }
    );

  targetSelect.onchange = () => {
    resetResult();
    updateSourceLayer(config);
  };

  byId("importFile").onchange =
    resetResult;

  byId("executeImportButton").onclick =
    async () => {
      const file =
        byId("importFile")
          .files?.[0];

      const target =
        selectedTarget(config);

      const mode =
        byId("importMode").value;

      const sourceLayer =
        byId("importSourceLayer")
          .value.trim();

      if (!target) {
        showResult(
          "Select a target layer.",
          true
        );
        return;
      }

      if (!file) {
        showResult(
          "Select a GeoPackage file.",
          true
        );
        return;
      }

      if (
        !file.name
          .toLowerCase()
          .endsWith(".gpkg")
      ) {
        showResult(
          "Only .gpkg files are accepted.",
          true
        );
        return;
      }

      if (
        file.size >
        config.maxFileSizeMb *
          1024 *
          1024
      ) {
        showResult(
          `Maximum file size is ${config.maxFileSizeMb} MB.`,
          true
        );
        return;
      }

      if (!sourceLayer) {
        showResult(
          "Enter the source layer name inside the GeoPackage.",
          true
        );
        return;
      }

      const warning =
        mode === "replace"
          ? (
              `REPLACE ${target.label}?\n\n` +
              "All existing records in the target table will be deleted before import."
            )
          : (
              `ADD records to ${target.label}?`
            );

      if (!window.confirm(warning)) {
        return;
      }

      resetResult();
      setBusy(true);

      try {
        const formData =
          new FormData();

        formData.append(
          "target",
          target.key
        );

        formData.append(
          "mode",
          mode
        );

        formData.append(
          "source_layer",
          sourceLayer
        );

        formData.append(
          "file",
          file
        );

        const result =
          await requestImport(
            config.endpoint,
            {
              method: "POST",
              body: formData
            }
          );

        showResult(result);

        await done(
          result,
          target
        );
      } catch (error) {
        showResult(
          error.name === "AbortError"
            ? "Import timed out."
            : error.message,
          true
        );
      } finally {
        setBusy(false);
      }
    };
}

/**
 * FIMS Cloud Timber Volume Manager
 * Phase 1: browser-based Zone / Vegetation Type editor.
 *
 * The module loads the migrated ctrl_TimberVolume_NEW data from CSV,
 * filters it by the selected Province and presents the legacy-style
 * "Update Timber Volumes for Zone" screen.
 *
 * GitHub Pages cannot write directly to PostgreSQL. Edits are therefore
 * stored as a local draft until a secured backend API is configured.
 */

export const TIMBER_VOLUME_MODULE_ID =
  "timber-volume";

const DEFAULT_CSV_URL =
  "./data/timber_volume_master.csv";

const STORAGE_KEY =
  "fims-cloud:timber-volume-draft:v1";

function text(value) {
  return String(value ?? "").trim();
}

function numberOrNull(value) {
  const normalized = text(value);

  if (
    normalized === "" ||
    normalized.toUpperCase() === "NULL"
  ) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Minimal CSV parser supporting quoted values and escaped quotes.
 */
function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const source =
    String(csvText ?? "")
      .replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (quoted) {
      if (
        character === '"' &&
        next === '"'
      ) {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (
      character === "\n" ||
      character === "\r"
    ) {
      if (
        character === "\r" &&
        next === "\n"
      ) {
        index += 1;
      }

      row.push(field);
      field = "";

      if (
        row.some(
          (value) =>
            text(value) !== ""
        )
      ) {
        rows.push(row);
      }

      row = [];
    } else {
      field += character;
    }
  }

  if (
    field !== "" ||
    row.length > 0
  ) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers =
    rows[0].map(
      (header) =>
        text(header)
    );

  return rows.slice(1).map((values) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] =
        values[index] ?? "";
    });

    return record;
  });
}

function createRowKey(record) {
  return [
    record.province,
    record.zone,
    record.vegType
  ].join("|");
}

export class TimberVolumeManager {
  constructor(options = {}) {
    this.csvUrl =
      options.csvUrl ||
      DEFAULT_CSV_URL;

    this.apiBaseUrl =
      text(options.apiBaseUrl);

    this.onStatus =
      typeof options.onStatus === "function"
        ? options.onStatus
        : () => {};

    this.onError =
      typeof options.onError === "function"
        ? options.onError
        : () => {};

    this.getSelectedProvince =
      typeof options.getSelectedProvince === "function"
        ? options.getSelectedProvince
        : () => null;

    this.dialog =
      document.getElementById(
        "timberVolumeDialog"
      );

    this.tableBody =
      document.getElementById(
        "timberVolumeTableBody"
      );

    this.provinceText =
      document.getElementById(
        "timberVolumeProvinceText"
      );

    this.countText =
      document.getElementById(
        "timberVolumeCountText"
      );

    this.searchInput =
      document.getElementById(
        "timberVolumeSearchInput"
      );

    this.saveDraftButton =
      document.getElementById(
        "saveTimberVolumeDraftButton"
      );

    this.applyButton =
      document.getElementById(
        "applyTimberVolumeUpdateButton"
      );

    this.closeButton =
      document.getElementById(
        "closeTimberVolumeDialogButton"
      );

    this.records = [];
    this.currentRecords = [];
    this.draft = this.loadDraft();
    this.loaded = false;

    this.bindEvents();
    this.updateApplyButton();
  }

  bindEvents() {
    this.searchInput?.addEventListener(
      "input",
      () => {
        this.render();
      }
    );

    this.saveDraftButton?.addEventListener(
      "click",
      () => {
        this.saveDraft();
      }
    );

    this.applyButton?.addEventListener(
      "click",
      async () => {
        await this.applyUpdates();
      }
    );

    this.closeButton?.addEventListener(
      "click",
      () => {
        this.close();
      }
    );
  }

  async load() {
    if (this.loaded) {
      return this.records;
    }

    const response =
      await fetch(
        this.csvUrl,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `Timber Volume CSV request failed (${response.status}).`
      );
    }

    const csvText =
      await response.text();

    this.records =
      parseCsv(csvText)
        .map((record) => ({
          province:
            numberOrNull(
              record.Province
            ),
          zone:
            numberOrNull(
              record.Zone
            ),
          vegType:
            text(
              record.VegType
            ),
          currentVol:
            numberOrNull(
              record["Vol/ha"]
            ),
          originalVol:
            numberOrNull(
              record["OriginalVol/ha"]
            ),
          comments:
            text(
              record.Comments
            ).toUpperCase() === "NULL"
              ? ""
              : text(
                  record.Comments
                )
        }))
        .filter(
          (record) =>
            Number.isFinite(
              record.province
            ) &&
            Number.isFinite(
              record.zone
            ) &&
            record.vegType
        );

    this.loaded = true;

    return this.records;
  }

  async open() {
    const province =
      this.getSelectedProvince();

    if (!province) {
      this.onStatus(
        "Select a Province before opening the Timber Volume editor."
      );

      return false;
    }

    try {
      await this.load();

      const provinceCode =
        Number(
          province.code ??
          province.provinceCode ??
          province.properties?.code ??
          province.properties?.province ??
          province.id
        );

      if (!Number.isFinite(provinceCode)) {
        throw new Error(
          "The selected Province does not have a valid numeric code."
        );
      }

      const provinceName =
        text(
          province.name ??
          province.provinceName ??
          province.properties?.name ??
          province.properties?.descrip
        ) ||
        `Province ${provinceCode}`;

      this.currentRecords =
        this.records
          .filter(
            (record) =>
              record.province ===
              provinceCode
          )
          .sort(
            (a, b) =>
              a.zone - b.zone ||
              a.vegType.localeCompare(
                b.vegType,
                "en",
                {
                  numeric: true,
                  sensitivity: "base"
                }
              )
          );

      if (this.provinceText) {
        this.provinceText.textContent =
          `${provinceCode} ${provinceName}`;
      }

      if (this.searchInput) {
        this.searchInput.value = "";
      }

      this.render();

      if (
        typeof this.dialog?.showModal ===
        "function"
      ) {
        this.dialog.showModal();
      } else if (this.dialog) {
        this.dialog.hidden = false;
      }

      this.onStatus(
        `Timber Volume editor opened for ${provinceName}.`
      );

      return true;
    } catch (error) {
      this.onError(error);
      return false;
    }
  }

  close() {
    if (
      typeof this.dialog?.close ===
      "function" &&
      this.dialog.open
    ) {
      this.dialog.close();
    } else if (this.dialog) {
      this.dialog.hidden = true;
    }
  }

  getFilteredRecords() {
    const query =
      text(
        this.searchInput?.value
      ).toLocaleLowerCase("en");

    if (!query) {
      return this.currentRecords;
    }

    return this.currentRecords.filter(
      (record) =>
        String(record.zone)
          .includes(query) ||
        record.vegType
          .toLocaleLowerCase("en")
          .includes(query) ||
        record.comments
          .toLocaleLowerCase("en")
          .includes(query)
    );
  }

  render() {
    if (!this.tableBody) {
      return;
    }

    const records =
      this.getFilteredRecords();

    this.tableBody.replaceChildren();

    for (const record of records) {
      const key =
        createRowKey(record);

      const draftValue =
        this.draft[key];

      const currentValue =
        draftValue?.volPerHa ??
        record.currentVol ??
        0;

      const row =
        document.createElement("tr");

      row.innerHTML = `
        <td class="number-cell">${escapeHtml(record.zone)}</td>
        <td>${escapeHtml(record.vegType)}</td>
        <td class="number-cell">${escapeHtml(record.originalVol ?? 0)}</td>
        <td class="number-cell">
          <input
            class="timber-volume-input"
            type="number"
            min="0"
            step="0.01"
            value="${escapeHtml(currentValue)}"
            aria-label="Current volume for Zone ${escapeHtml(record.zone)}, Vegetation Type ${escapeHtml(record.vegType)}"
          />
        </td>
        <td>
          <input
            class="timber-comment-input"
            type="text"
            value="${escapeHtml(draftValue?.comments ?? record.comments)}"
            aria-label="Comments for Zone ${escapeHtml(record.zone)}, Vegetation Type ${escapeHtml(record.vegType)}"
          />
        </td>
      `;

      const volumeInput =
        row.querySelector(
          ".timber-volume-input"
        );

      const commentInput =
        row.querySelector(
          ".timber-comment-input"
        );

      const updateDraft =
        () => {
          const volPerHa =
            numberOrNull(
              volumeInput?.value
            );

          if (
            volPerHa === null ||
            volPerHa < 0
          ) {
            volumeInput?.setCustomValidity(
              "Enter a non-negative numeric value."
            );

            return;
          }

          volumeInput?.setCustomValidity("");

          const unchanged =
            volPerHa ===
              (record.currentVol ?? 0) &&
            text(commentInput?.value) ===
              record.comments;

          if (unchanged) {
            delete this.draft[key];
          } else {
            this.draft[key] = {
              province:
                record.province,
              zone:
                record.zone,
              vegType:
                record.vegType,
              volPerHa,
              originalVolPerHa:
                record.originalVol,
              comments:
                text(
                  commentInput?.value
                )
            };
          }

          this.updateApplyButton();
          row.classList.toggle(
            "edited",
            !unchanged
          );
        };

      volumeInput?.addEventListener(
        "input",
        updateDraft
      );

      commentInput?.addEventListener(
        "input",
        updateDraft
      );

      row.classList.toggle(
        "edited",
        Boolean(draftValue)
      );

      this.tableBody.appendChild(row);
    }

    if (this.countText) {
      this.countText.textContent =
        `${records.length} rows / ${Object.keys(this.draft).length} draft changes`;
    }

    this.updateApplyButton();
  }

  loadDraft() {
    try {
      const value =
        window.localStorage
          .getItem(STORAGE_KEY);

      return value
        ? JSON.parse(value)
        : {};
    } catch {
      return {};
    }
  }

  saveDraft() {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(this.draft)
    );

    this.onStatus(
      `${Object.keys(this.draft).length} Timber Volume draft change(s) saved in this browser.`
    );
  }

  updateApplyButton() {
    if (!this.applyButton) {
      return;
    }

    const hasChanges =
      Object.keys(this.draft)
        .length > 0;

    const apiConfigured =
      Boolean(this.apiBaseUrl);

    this.applyButton.disabled =
      !hasChanges ||
      !apiConfigured;

    this.applyButton.setAttribute(
      "aria-disabled",
      String(
        this.applyButton.disabled
      )
    );

    this.applyButton.title =
      apiConfigured
        ? "Apply Timber Volume changes through the secured backend API."
        : "A secured backend API must be configured before database updates can be applied.";
  }

  async applyUpdates() {
    if (!this.apiBaseUrl) {
      this.onStatus(
        "Timber Volume changes are saved as a local draft. Configure the secured backend API to update PostgreSQL."
      );

      return false;
    }

    const changes =
      Object.values(this.draft);

    if (changes.length === 0) {
      this.onStatus(
        "There are no Timber Volume changes to apply."
      );

      return false;
    }

    try {
      const response =
        await fetch(
          `${this.apiBaseUrl.replace(/\/$/, "")}/timber-volumes/zone`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json"
            },
            credentials:
              "include",
            body:
              JSON.stringify({
                changes
              })
          }
        );

      if (!response.ok) {
        throw new Error(
          `Timber Volume update failed (${response.status}).`
        );
      }

      this.draft = {};
      window.localStorage
        .removeItem(STORAGE_KEY);

      this.loaded = false;
      await this.load();
      await this.open();

      this.onStatus(
        `${changes.length} Timber Volume change(s) applied successfully.`
      );

      return true;
    } catch (error) {
      this.onError(error);
      return false;
    }
  }
}

/**
 * FIMS Cloud Timber Volume Manager
 * Ver.2.8.0 — OCI FastAPI integration without browser draft storage
 *
 * Live endpoints:
 *   GET  {apiBaseUrl}/timber-volume/province/{province}
 *   PUT  {apiBaseUrl}/timber-volumes/zone
 *
 * The bundled CSV is retained only as a read-only fallback.
 */

export const TIMBER_VOLUME_MODULE_ID = "timber-volume";

const DEFAULT_CSV_URL = "./data/timber_volume_master.csv";
const REQUEST_TIMEOUT_MS = 20000;

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toNumberOrNull(value) {
  const normalized = normalizeText(value);

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
  return normalizeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  const source =
    String(csvText ?? "")
      .replace(/^\uFEFF/, "");

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    const character = source[index];
    const next = source[index + 1];

    if (quoted) {
      if (
        character === '"' &&
        next === '"'
      ) {
        field += '"';
        index += 1;
      } else if (
        character === '"'
      ) {
        quoted = false;
      } else {
        field += character;
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (
      character === ","
    ) {
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
            normalizeText(value) !== ""
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
        normalizeText(header)
    );

  return rows
    .slice(1)
    .map((values) => {
      const record = {};

      headers.forEach(
        (header, index) => {
          record[header] =
            values[index] ?? "";
        }
      );

      return record;
    });
}

async function fetchWithTimeout(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timer =
    window.setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal
      }
    );
  } finally {
    window.clearTimeout(timer);
  }
}

function createKey(record) {
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
      normalizeText(
        options.apiBaseUrl
      ).replace(/\/$/, "");

    this.getSelectedProvince =
      typeof options
        .getSelectedProvince ===
        "function"
        ? options.getSelectedProvince
        : () => null;

    this.onStatus =
      typeof options.onStatus ===
        "function"
        ? options.onStatus
        : () => {};

    this.onError =
      typeof options.onError ===
        "function"
        ? options.onError
        : () => {};

    this.onUpdated =
      typeof options.onUpdated ===
        "function"
        ? options.onUpdated
        : async () => {};

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

    this.sourceText =
      document.getElementById(
        "timberVolumeSourceText"
      );

    this.searchInput =
      document.getElementById(
        "timberVolumeSearchInput"
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
    this.currentProvinceCode = null;
    this.dataSource = "none";
    this.loading = false;
    this.changes = {};

    this.bindEvents();
    this.renderSourceState();
    this.updateApplyButton();
  }

  bindEvents() {
    this.searchInput
      ?.addEventListener(
        "input",
        () => this.render()
      );

    this.applyButton
      ?.addEventListener(
        "click",
        async () => {
          await this.applyUpdates();
        }
      );

    this.closeButton
      ?.addEventListener(
        "click",
        () => this.close()
      );
  }

  getProvinceCode(province) {
    const value =
      province?.code ??
      province?.provinceCode ??
      province?.province_code ??
      province?.properties?.code ??
      province?.properties
        ?.province ??
      province?.properties
        ?.province_code ??
      province?.id;

    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  getProvinceName(
    province,
    provinceCode
  ) {
    return (
      normalizeText(
        province?.name ??
        province?.provinceName ??
        province?.province_name ??
        province?.properties?.name ??
        province?.properties?.descrip
      ) ||
      `Province ${provinceCode}`
    );
  }

  async loadFromApi(
    provinceCode
  ) {
    const response =
      await fetchWithTimeout(
        `${this.apiBaseUrl}/timber-volume/province/${provinceCode}`,
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json"
          },
          credentials:
            "omit",
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `API request failed (${response.status}).`
      );
    }

    const payload =
      await response.json();

    return (
      Array.isArray(
        payload.records
      )
        ? payload.records
        : []
    ).map(
      (record) => ({
        province:
          toNumberOrNull(
            record.province
          ),
        zone:
          toNumberOrNull(
            record.zone
          ),
        vegType:
          normalizeText(
            record.veg_type
          ),
        currentVol:
          toNumberOrNull(
            record.vol_per_ha
          ),
        originalVol:
          toNumberOrNull(
            record
              .original_vol_per_ha
          ),
        comments:
          normalizeText(
            record.comments
          )
      })
    );
  }

  async loadFromCsv(
    provinceCode
  ) {
    const response =
      await fetchWithTimeout(
        this.csvUrl,
        {
          cache:
            "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        `CSV request failed (${response.status}).`
      );
    }

    const rows =
      parseCsv(
        await response.text()
      );

    return rows
      .map(
        (record) => ({
          province:
            toNumberOrNull(
              record.Province
            ),
          zone:
            toNumberOrNull(
              record.Zone
            ),
          vegType:
            normalizeText(
              record.VegType
            ),
          currentVol:
            toNumberOrNull(
              record["Vol/ha"]
            ),
          originalVol:
            toNumberOrNull(
              record[
                "OriginalVol/ha"
              ]
            ),
          comments:
            normalizeText(
              record.Comments
            ).toUpperCase() ===
              "NULL"
              ? ""
              : normalizeText(
                  record.Comments
                )
        })
      )
      .filter(
        (record) =>
          record.province ===
          provinceCode
      );
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

    const provinceCode =
      this.getProvinceCode(
        province
      );

    if (
      !Number.isFinite(
        provinceCode
      )
    ) {
      this.onError(
        new Error(
          "The selected Province has no valid numeric code."
        )
      );

      return false;
    }

    this.currentProvinceCode =
      provinceCode;

    this.setLoading(true);

    try {
      if (this.apiBaseUrl) {
        try {
          this.records =
            await this.loadFromApi(
              provinceCode
            );

          this.dataSource =
            "api";
        } catch (apiError) {
          this.onStatus(
            `Timber Volume API unavailable; using read-only CSV fallback (${apiError.message}).`
          );

          this.records =
            await this.loadFromCsv(
              provinceCode
            );

          this.dataSource =
            "csv";
        }
      } else {
        this.records =
          await this.loadFromCsv(
            provinceCode
          );

        this.dataSource =
          "csv";
      }

      this.currentRecords =
        [...this.records]
          .sort(
            (a, b) =>
              a.zone - b.zone ||
              a.vegType
                .localeCompare(
                  b.vegType,
                  "en",
                  {
                    numeric:
                      true,
                    sensitivity:
                      "base"
                  }
                )
          );

      if (this.provinceText) {
        this.provinceText
          .textContent =
          `${provinceCode} ${this.getProvinceName(
            province,
            provinceCode
          )}`;
      }

      if (this.searchInput) {
        this.searchInput.value =
          "";
      }

      this.render();
      this.renderSourceState();

      if (
        typeof this.dialog
          ?.showModal ===
        "function"
      ) {
        if (!this.dialog.open) {
          this.dialog.showModal();
        }
      } else if (
        this.dialog
      ) {
        this.dialog.hidden =
          false;
      }

      this.onStatus(
        this.dataSource ===
          "api"
          ? "Live Timber Volume data loaded from PostgreSQL."
          : "Read-only Timber Volume CSV fallback loaded."
      );

      return true;
    } catch (error) {
      this.onError(error);
      return false;
    } finally {
      this.setLoading(false);
    }
  }

  close() {
    if (
      typeof this.dialog?.close ===
        "function" &&
      this.dialog.open
    ) {
      this.dialog.close();
    } else if (
      this.dialog
    ) {
      this.dialog.hidden =
        true;
    }
  }

  setLoading(loading) {
    this.loading =
      Boolean(loading);

    this.dialog
      ?.classList.toggle(
        "is-loading",
        this.loading
      );

    this.updateApplyButton();
  }

  renderSourceState() {
    if (!this.sourceText) {
      return;
    }

    if (
      this.dataSource ===
      "api"
    ) {
      this.sourceText.textContent =
        "API: Connected";

      this.sourceText.className =
        "api-status api-status-connected";
    } else if (
      this.dataSource ===
      "csv"
    ) {
      this.sourceText.textContent =
        "API: Offline — CSV fallback";

      this.sourceText.className =
        "api-status api-status-fallback";
    } else {
      this.sourceText.textContent =
        this.apiBaseUrl
          ? "API: Not checked"
          : "API: Not configured";

      this.sourceText.className =
        "api-status";
    }
  }

  getFilteredRecords() {
    const query =
      normalizeText(
        this.searchInput
          ?.value
      ).toLocaleLowerCase(
        "en"
      );

    if (!query) {
      return this.currentRecords;
    }

    return this.currentRecords
      .filter(
        (record) =>
          String(
            record.zone
          ).includes(query) ||
          record.vegType
            .toLocaleLowerCase(
              "en"
            )
            .includes(query) ||
          record.comments
            .toLocaleLowerCase(
              "en"
            )
            .includes(query)
      );
  }

  render() {
    if (!this.tableBody) {
      return;
    }

    const records =
      this.getFilteredRecords();

    this.tableBody
      .replaceChildren();

    for (
      const record
      of records
    ) {
      const key =
        createKey(record);

      const change =
        this.changes[key];

      const row =
        document.createElement(
          "tr"
        );

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
            value="${escapeHtml(change?.volPerHa ?? record.currentVol ?? 0)}"
          />
        </td>
        <td>
          <input
            class="timber-comment-input"
            type="text"
            value="${escapeHtml(change?.comments ?? record.comments)}"
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

      const updateChange =
        () => {
          const volPerHa =
            toNumberOrNull(
              volumeInput?.value
            );

          if (
            volPerHa === null ||
            volPerHa < 0
          ) {
            volumeInput
              ?.setCustomValidity(
                "Enter a non-negative numeric value."
              );

            return;
          }

          volumeInput
            ?.setCustomValidity("");

          const comments =
            normalizeText(
              commentInput?.value
            );

          const unchanged =
            volPerHa ===
              (record.currentVol ??
                0) &&
            comments ===
              record.comments;

          if (unchanged) {
            delete this.changes[
              key
            ];
          } else {
            this.changes[key] = {
              province:
                record.province,
              zone:
                record.zone,
              vegType:
                record.vegType,
              volPerHa,
              comments
            };
          }

          row.classList.toggle(
            "edited",
            !unchanged
          );
          this.updateCount(
            records.length
          );
          this.updateApplyButton();
        };

      volumeInput
        ?.addEventListener(
          "input",
          updateChange
        );

      commentInput
        ?.addEventListener(
          "input",
          updateChange
        );

      row.classList.toggle(
        "edited",
        Boolean(change)
      );

      this.tableBody
        .appendChild(row);
    }

    this.updateCount(
      records.length
    );

    this.updateApplyButton();
  }

  updateCount(visibleRows) {
    if (!this.countText) {
      return;
    }

    const changes =
      Object.values(
        this.changes
      ).filter(
        (change) =>
          change.province ===
          this.currentProvinceCode
      ).length;

    this.countText.textContent =
      `${visibleRows} rows / ${changes} change(s)`;
  }

  updateApplyButton() {
    if (!this.applyButton) {
      return;
    }

    const hasChanges =
      Object.values(
        this.changes
      ).some(
        (change) =>
          change.province ===
          this.currentProvinceCode
      );

    const liveApi =
      Boolean(
        this.apiBaseUrl
      ) &&
      this.dataSource ===
        "api";

    this.applyButton.disabled =
      this.loading ||
      !hasChanges ||
      !liveApi;

    this.applyButton
      .setAttribute(
        "aria-disabled",
        String(
          this.applyButton
            .disabled
        )
      );
  }

  async applyUpdates() {
    const changes =
      Object.values(
        this.changes
      ).filter(
        (change) =>
          change.province ===
          this.currentProvinceCode
      );

    if (
      changes.length === 0
    ) {
      this.onStatus(
        "There are no Timber Volume changes to apply."
      );

      return false;
    }

    if (
      !this.apiBaseUrl ||
      this.dataSource !==
        "api"
    ) {
      this.onStatus(
        "A live secured API connection is required to update PostgreSQL."
      );

      return false;
    }

    if (
      !window.confirm(
        `Apply ${changes.length} Timber Volume change(s) and recalculate unprotected FMUs?`
      )
    ) {
      return false;
    }

    this.setLoading(true);

    try {
      const response =
        await fetchWithTimeout(
          `${this.apiBaseUrl}/timber-volumes/zone`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
              "Accept":
                "application/json"
            },
            credentials:
              "omit",
            body:
              JSON.stringify({
                changes:
                  changes.map(
                    (change) => ({
                      province:
                        change.province,
                      zone:
                        change.zone,
                      veg_type:
                        change.vegType,
                      vol_per_ha:
                        change.volPerHa,
                      comments:
                        change.comments ||
                        null
                    })
                  )
              })
          }
        );

      const payload =
        await response.json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload.detail ||
          `Timber Volume update failed (${response.status}).`
        );
      }

      for (
        const change
        of changes
      ) {
        delete this.changes[
          [
            change.province,
            change.zone,
            change.vegType
          ].join("|")
        ];
      }

      this.onStatus(
        `${payload.change_count ?? changes.length} change(s) applied; ` +
        `${payload.updated_fmu_rows ?? 0} FMU row(s) recalculated; ` +
        `${payload.protected_fmu_rows ?? 0} individually updated FMU row(s) protected.`
      );

      await this.onUpdated(
        payload
      );

      await this.open();

      return true;
    } catch (error) {
      this.onError(error);
      return false;
    } finally {
      this.setLoading(false);
    }
  }
}

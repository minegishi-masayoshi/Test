/**
 * ============================================================
 * FIMS Cloud Ver.2.0
 * Main Function Menu Module
 * ============================================================
 *
 * File:
 *   js/menu.js
 *
 * Responsibilities:
 *   - Define the old-FIMS main function menu
 *   - Render menu buttons
 *   - Control active and disabled states
 *   - Dispatch module-selection events
 *   - Open the Large Map view
 *   - Return to the configured FRIMS/FIMS portal
 *   - Provide compatibility functions for the Ver.1 menu API
 *
 * Main menu order:
 *   1. Province
 *   2. Concession
 *   3. Proposed Concession
 *   4. Large Map
 *   5. Assessment by FIPS
 *   6. Administration
 *   7. Exit
 *
 * Current Ver.2 implementation:
 *   - Province: enabled
 *   - Large Map: enabled
 *   - Exit: enabled
 *   - Other modules: displayed but disabled until implemented
 * ============================================================
 */

import {
  CONFIG
} from "./config.js";

/* ============================================================
 * 1. Constants
 * ============================================================
 */

/**
 * Menu module version.
 */
export const MENU_MODULE_VERSION = "2.0.0";

/**
 * Default menu container ID.
 */
export const DEFAULT_MENU_CONTAINER_ID = "main-menu";

/**
 * Supported module identifiers.
 */
export const MENU_MODULE_ID = Object.freeze({
  PROVINCE: "province",
  CONCESSION: "concession",
  PROPOSED_CONCESSION: "proposedConcession",
  LARGE_MAP: "largeMap",
  ASSESSMENT: "assessment",
  ADMINISTRATION: "administration",
  EXIT: "exit"
});

/**
 * Menu item types.
 */
export const MENU_ITEM_TYPE = Object.freeze({
  MODULE: "module",
  ACTION: "action",
  LINK: "link"
});

/**
 * Menu event source values.
 */
export const MENU_EVENT_SOURCE = Object.freeze({
  USER: "user",
  APPLICATION: "application",
  KEYBOARD: "keyboard"
});

/**
 * Menu state values.
 */
export const MENU_STATUS = Object.freeze({
  IDLE: "idle",
  READY: "ready",
  ERROR: "error",
  DESTROYED: "destroyed"
});

/* ============================================================
 * 2. Old-FIMS menu definitions
 * ============================================================
 */

/**
 * Main function menu.
 *
 * The item order follows the legacy Province Selection screen.
 *
 * Notes:
 *   - enabledByDefault indicates whether the module is currently
 *     operational in FIMS Cloud Ver.2.
 *
 *   - configModuleKey links the item to CONFIG.modules where
 *     available.
 *
 *   - icon is intentionally text-based so GitHub Pages does not
 *     require an external icon library.
 */
export const MENU_ITEMS = Object.freeze([
  Object.freeze({
    id: MENU_MODULE_ID.PROVINCE,
    configModuleKey: "province",
    label: "Province",
    icon: "▤",
    title: "Open Province information",
    description:
      "Display Provinces, FMUs, Province map, Summary and Reports.",
    type: MENU_ITEM_TYPE.MODULE,
    enabledByDefault: true,
    activeByDefault: true,
    cssClass: "province-menu-button"
  }),

  Object.freeze({
    id: MENU_MODULE_ID.CONCESSION,
    configModuleKey: "concession",
    label: "Concession",
    icon: "▰",
    title: "Open Concession information",
    description:
      "Display and manage forest Concession information.",
    type: MENU_ITEM_TYPE.MODULE,
    enabledByDefault: false,
    activeByDefault: false,
    cssClass: "concession-menu-button"
  }),

  Object.freeze({
    id: MENU_MODULE_ID.PROPOSED_CONCESSION,
    configModuleKey: "proposedConcession",
    label: "Proposed Concession",
    icon: "◇",
    title: "Open Proposed Concession information",
    description:
      "Display proposed forest Concession information.",
    type: MENU_ITEM_TYPE.MODULE,
    enabledByDefault: false,
    activeByDefault: false,
    cssClass: "proposed-concession-menu-button"
  }),

  Object.freeze({
    id: MENU_MODULE_ID.LARGE_MAP,
    configModuleKey: "largeMap",
    label: "Large Map",
    icon: "▣",
    title: "Open the Province map in a larger view",
    description:
      "Expand the current FIMS map for detailed inspection.",
    type: MENU_ITEM_TYPE.ACTION,
    enabledByDefault: true,
    activeByDefault: false,
    cssClass: "large-map-menu-button"
  }),

  Object.freeze({
    id: MENU_MODULE_ID.ASSESSMENT,
    configModuleKey: "assessment",
    label: "Assessment by FIPS",
    icon: "◎",
    title: "Open forest inventory assessment",
    description:
      "Open the FIPS forest inventory assessment module.",
    type: MENU_ITEM_TYPE.LINK,
    enabledByDefault: false,
    activeByDefault: false,
    cssClass: "assessment-menu-button"
  }),

  Object.freeze({
    id: MENU_MODULE_ID.ADMINISTRATION,
    configModuleKey: "administration",
    label: "Administration",
    icon: "⚙",
    title: "Open Administration",
    description:
      "Open application and data administration functions.",
    type: MENU_ITEM_TYPE.MODULE,
    enabledByDefault: false,
    activeByDefault: false,
    cssClass: "administration-menu-button"
  }),

  Object.freeze({
    id: MENU_MODULE_ID.EXIT,
    configModuleKey: "exit",
    label: "Exit",
    icon: "×",
    title: "Return to the FIMS or FRIMS portal",
    description:
      "Leave the Province module and return to the portal.",
    type: MENU_ITEM_TYPE.ACTION,
    enabledByDefault: true,
    activeByDefault: false,
    cssClass: "exit-button"
  })
]);

/* ============================================================
 * 3. MenuManager class
 * ============================================================
 */

/**
 * Controls the FIMS main function menu.
 */
export class MenuManager {
  /**
   * @param {object} [options]
   * @param {string|HTMLElement} [options.container]
   * @param {object} [options.config]
   * @param {object[]} [options.items]
   * @param {string} [options.activeItemId]
   * @param {Function} [options.onSelect]
   * @param {Function} [options.onStatus]
   * @param {Function} [options.onError]
   * @param {Function} [options.onLargeMap]
   * @param {Function} [options.onExit]
   */
  constructor(options = {}) {
    const {
      container =
        CONFIG.provinceScreen?.elements?.mainMenu ||
        CONFIG.provinceScreen?.elements?.menu ||
        DEFAULT_MENU_CONTAINER_ID,

      config = CONFIG,

      items = MENU_ITEMS,

      activeItemId =
        MENU_MODULE_ID.PROVINCE,

      onSelect = () => {},
      onStatus = () => {},
      onError = () => {},
      onLargeMap = null,
      onExit = null
    } = options;

    this.config = config;

    this.containerReference = container;
    this.container = null;

    this.items =
      this.normalizeItems(items);

    this.activeItemId =
      activeItemId || null;

    this.focusedItemId = null;

    this.itemStates =
      new Map();

    this.buttonElements =
      new Map();

    this.callbacks = {
      onSelect:
        typeof onSelect === "function"
          ? onSelect
          : () => {},

      onStatus:
        typeof onStatus === "function"
          ? onStatus
          : () => {},

      onError:
        typeof onError === "function"
          ? onError
          : () => {},

      onLargeMap:
        typeof onLargeMap === "function"
          ? onLargeMap
          : null,

      onExit:
        typeof onExit === "function"
          ? onExit
          : null
    };

    this.status = MENU_STATUS.IDLE;
    this.initialized = false;
    this.destroyed = false;

    this.boundKeydownHandler =
      this.handleContainerKeydown.bind(this);

    this.initialize();
  }

  /* ==========================================================
   * 4. Initialization
   * ==========================================================
   */

  /**
   * Initializes and renders the menu.
   */
  initialize() {
    if (this.destroyed) {
      return;
    }

    this.container =
      this.resolveContainer(
        this.containerReference
      );

    if (!this.container) {
      const error =
        new MenuInitializationError(
          "The main menu container was not found."
        );

      this.status =
        MENU_STATUS.ERROR;

      this.handleError(
        error.message,
        error
      );

      return;
    }

    this.initializeItemStates();

    this.container.addEventListener(
      "keydown",
      this.boundKeydownHandler
    );

    this.render();

    this.initialized = true;
    this.status = MENU_STATUS.READY;
  }

  /**
   * Resolves a container reference.
   *
   * @param {string|HTMLElement} reference
   * @returns {HTMLElement|null}
   */
  resolveContainer(reference) {
    if (
      typeof HTMLElement !== "undefined" &&
      reference instanceof HTMLElement
    ) {
      return reference;
    }

    if (
      typeof reference === "string" &&
      reference.trim()
    ) {
      return document.getElementById(
        reference.trim()
      );
    }

    return null;
  }

  /**
   * Normalizes menu item definitions.
   *
   * @param {object[]} items
   * @returns {object[]}
   */
  normalizeItems(items) {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          item.id
      )
      .map(
        (item, index) => ({
          id: String(item.id),

          configModuleKey:
            item.configModuleKey ||
            item.id,

          label:
            String(
              item.label ||
              item.id
            ),

          icon:
            String(
              item.icon || ""
            ),

          title:
            String(
              item.title ||
              item.label ||
              item.id
            ),

          description:
            String(
              item.description || ""
            ),

          type:
            item.type ||
            MENU_ITEM_TYPE.MODULE,

          enabledByDefault:
            item.enabledByDefault !== false,

          activeByDefault:
            Boolean(
              item.activeByDefault
            ),

          cssClass:
            String(
              item.cssClass || ""
            ),

          order:
            Number.isFinite(
              Number(item.order)
            )
              ? Number(item.order)
              : index,

          url:
            item.url || null,

          target:
            item.target || null
        })
      )
      .sort(
        (left, right) =>
          left.order - right.order
      );
  }

  /**
   * Initializes runtime state for each menu item.
   */
  initializeItemStates() {
    this.itemStates.clear();

    for (const item of this.items) {
      const enabled =
        this.resolveItemEnabledState(
          item
        );

      this.itemStates.set(
        item.id,
        {
          enabled,
          visible: true,
          loading: false,
          badge: null,
          reason:
            enabled
              ? null
              : this.getDisabledReason(item)
        }
      );
    }

    if (
      !this.activeItemId ||
      !this.getItem(
        this.activeItemId
      )
    ) {
      const defaultItem =
        this.items.find(
          (item) =>
            item.activeByDefault
        ) ||
        this.items.find(
          (item) =>
            this.isItemEnabled(item.id)
        );

      this.activeItemId =
        defaultItem?.id || null;
    }
  }

  /**
   * Resolves whether an item is enabled.
   *
   * Priority:
   *   1. CONFIG.modules module setting
   *   2. Item enabledByDefault setting
   *
   * @param {object} item
   * @returns {boolean}
   */
  resolveItemEnabledState(item) {
    const moduleConfiguration =
      this.getModuleConfiguration(
        item
      );

    if (
      moduleConfiguration &&
      typeof moduleConfiguration.enabled ===
        "boolean"
    ) {
      return moduleConfiguration.enabled;
    }

    return Boolean(
      item.enabledByDefault
    );
  }

  /**
   * Returns a matching CONFIG.modules definition.
   *
   * @param {object} item
   * @returns {object|null}
   */
  getModuleConfiguration(item) {
    const modules =
      this.config.modules ?? {};

    const candidateKeys = [
      item.configModuleKey,
      item.id,

      item.id ===
        MENU_MODULE_ID.PROPOSED_CONCESSION
        ? "proposed"
        : null,

      item.id ===
        MENU_MODULE_ID.ADMINISTRATION
        ? "admin"
        : null,

      item.id ===
        MENU_MODULE_ID.ASSESSMENT
        ? "fips"
        : null
    ].filter(Boolean);

    for (const key of candidateKeys) {
      if (
        Object.prototype.hasOwnProperty.call(
          modules,
          key
        )
      ) {
        return modules[key];
      }
    }

    return null;
  }

  /**
   * Returns the disabled reason shown to the user.
   *
   * @param {object} item
   * @returns {string}
   */
  getDisabledReason(item) {
    const moduleConfiguration =
      this.getModuleConfiguration(
        item
      );

    return (
      moduleConfiguration?.disabledMessage ||
      moduleConfiguration?.message ||
      `${item.label} is not yet available in FIMS Cloud Ver.2.`
    );
  }

  /* ==========================================================
   * 5. Rendering
   * ==========================================================
   */

  /**
   * Renders the menu.
   *
   * @returns {HTMLElement|null}
   */
  render() {
    if (
      !this.container ||
      this.destroyed
    ) {
      return null;
    }

    this.container.replaceChildren();
    this.buttonElements.clear();

    this.container.classList.add(
      "module-menu"
    );

    this.container.setAttribute(
      "role",
      "navigation"
    );

    this.container.setAttribute(
      "aria-label",
      "FIMS main functions"
    );

    for (const item of this.items) {
      const state =
        this.itemStates.get(
          item.id
        );

      if (!state?.visible) {
        continue;
      }

      const button =
        this.createMenuButton(
          item,
          state
        );

      this.buttonElements.set(
        item.id,
        button
      );

      this.container.appendChild(
        button
      );
    }

    this.updateActiveState();

    return this.container;
  }

  /**
   * Creates one menu button.
   *
   * @param {object} item
   * @param {object} state
   * @returns {HTMLButtonElement}
   */
  createMenuButton(item, state) {
    const button =
      document.createElement("button");

    button.type = "button";

    button.id =
      `menu-${item.id}`;

    button.className =
      [
        "module-button",
        item.cssClass
      ]
        .filter(Boolean)
        .join(" ");

    button.dataset.menuItemId =
      item.id;

    button.dataset.menuItemType =
      item.type;

    button.title =
      state.enabled
        ? item.title
        : state.reason ||
          item.title;

    button.disabled =
      !state.enabled ||
      state.loading;

    button.setAttribute(
      "aria-disabled",
      String(
        !state.enabled ||
        state.loading
      )
    );

    button.setAttribute(
      "aria-current",
      item.id === this.activeItemId
        ? "page"
        : "false"
    );

    const icon =
      document.createElement("span");

    icon.className =
      "module-button-icon";

    icon.setAttribute(
      "aria-hidden",
      "true"
    );

    icon.textContent =
      state.loading
        ? "…"
        : item.icon;

    const label =
      document.createElement("span");

    label.className =
      "module-button-label";

    label.textContent =
      item.label;

    button.append(
      icon,
      label
    );

    if (
      state.badge !== null &&
      state.badge !== undefined &&
      String(state.badge) !== ""
    ) {
      const badge =
        document.createElement("span");

      badge.className =
        "module-button-badge";

      badge.textContent =
        String(state.badge);

      button.appendChild(badge);
    }

    button.addEventListener(
      "click",
      (event) => {
        this.handleItemActivation(
          item.id,
          {
            source:
              MENU_EVENT_SOURCE.USER,

            originalEvent:
              event
          }
        );
      }
    );

    button.addEventListener(
      "focus",
      () => {
        this.focusedItemId =
          item.id;
      }
    );

    return button;
  }

  /**
   * Updates active classes and aria-current states.
   */
  updateActiveState() {
    for (
      const [itemId, button]
      of this.buttonElements.entries()
    ) {
      const active =
        itemId ===
        this.activeItemId;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-current",
        active
          ? "page"
          : "false"
      );
    }
  }

  /* ==========================================================
   * 6. Menu activation
   * ==========================================================
   */

  /**
   * Activates a menu item.
   *
   * @param {string} itemId
   * @param {object} [context]
   * @param {string} [context.source]
   * @param {Event} [context.originalEvent]
   * @param {boolean} [context.force=false]
   * @returns {Promise<boolean>}
   */
  async handleItemActivation(
    itemId,
    context = {}
  ) {
    const item =
      this.getItem(itemId);

    if (!item) {
      this.emitStatus(
        `Unknown menu item: ${itemId}`
      );

      return false;
    }

    const state =
      this.itemStates.get(
        item.id
      );

    if (
      !state?.enabled &&
      !context.force
    ) {
      this.emitStatus(
        state?.reason ||
        this.getDisabledReason(item)
      );

      return false;
    }

    if (
      state?.loading &&
      !context.force
    ) {
      return false;
    }

    try {
      switch (item.id) {
        case MENU_MODULE_ID.LARGE_MAP:
          return await this.executeLargeMapAction(
            item,
            context
          );

        case MENU_MODULE_ID.EXIT:
          return await this.executeExitAction(
            item,
            context
          );

        case MENU_MODULE_ID.ASSESSMENT:
          return await this.executeAssessmentAction(
            item,
            context
          );

        default:
          return await this.executeModuleAction(
            item,
            context
          );
      }
    } catch (error) {
      this.handleError(
        `${item.label} could not be opened.`,
        error
      );

      return false;
    }
  }

  /**
   * Selects a standard application module.
   */
  async executeModuleAction(
    item,
    context
  ) {
    this.setActiveItem(
      item.id,
      {
        notify: false
      }
    );

    const result =
      await this.invokeSelectCallback(
        item,
        context
      );

    if (result === false) {
      return false;
    }

    this.emitStatus(
      `${item.label} selected.`
    );

    return true;
  }

  /**
   * Executes the Large Map action.
   */
  async executeLargeMapAction(
    item,
    context
  ) {
    if (this.callbacks.onLargeMap) {
      const result =
        await this.callbacks.onLargeMap(
          item,
          context
        );

      if (result === false) {
        return false;
      }
    } else {
      this.toggleLargeMapLayout();
    }

    await this.invokeSelectCallback(
      item,
      context
    );

    this.emitStatus(
      "Large Map view opened."
    );

    return true;
  }

  /**
   * Executes the Assessment by FIPS action.
   */
  async executeAssessmentAction(
    item,
    context
  ) {
    const url =
      this.resolveItemUrl(item);

    const callbackResult =
      await this.invokeSelectCallback(
        item,
        context
      );

    if (callbackResult === false) {
      return false;
    }

    if (url) {
      this.openUrl(
        url,
        item.target || "_blank"
      );

      this.emitStatus(
        "Assessment by FIPS opened."
      );

      return true;
    }

    this.emitStatus(
      "Assessment by FIPS is not yet configured."
    );

    return false;
  }

  /**
   * Executes the Exit action.
   */
  async executeExitAction(
    item,
    context
  ) {
    if (this.callbacks.onExit) {
      const result =
        await this.callbacks.onExit(
          item,
          context
        );

      if (result === false) {
        return false;
      }

      return true;
    }

    const exitUrl =
      this.resolveExitUrl();

    if (exitUrl) {
      window.location.href =
        exitUrl;

      return true;
    }

    /*
     * GitHub Pages cannot close a browser tab unless the tab was
     * opened by JavaScript. The safe fallback returns to the
     * previous page where possible.
     */
    if (window.history.length > 1) {
      window.history.back();
      return true;
    }

    this.emitStatus(
      "No portal return URL is configured."
    );

    return false;
  }

  /**
   * Invokes the general item-selection callback.
   */
  async invokeSelectCallback(
    item,
    context
  ) {
    return await this.callbacks.onSelect(
      item,
      {
        source:
          context.source ||
          MENU_EVENT_SOURCE.APPLICATION,

        originalEvent:
          context.originalEvent ||
          null,

        manager:
          this
      }
    );
  }

  /* ==========================================================
   * 7. Active state
   * ==========================================================
   */

  /**
   * Sets the active module.
   *
   * Action items such as Large Map and Exit are not retained as
   * the active application module unless allowAction is true.
   *
   * @param {string|null} itemId
   * @param {object} [options]
   * @param {boolean} [options.notify=true]
   * @param {boolean} [options.allowAction=false]
   * @returns {boolean}
   */
  setActiveItem(
    itemId,
    options = {}
  ) {
    const {
      notify = true,
      allowAction = false
    } = options;

    if (itemId === null) {
      this.activeItemId = null;
      this.updateActiveState();
      return true;
    }

    const item =
      this.getItem(itemId);

    if (!item) {
      return false;
    }

    if (
      item.type !==
        MENU_ITEM_TYPE.MODULE &&
      !allowAction
    ) {
      return false;
    }

    this.activeItemId =
      item.id;

    this.updateActiveState();

    if (notify) {
      this.emitStatus(
        `${item.label} selected.`
      );
    }

    return true;
  }

  /**
   * Compatibility alias.
   */
  select(itemId, options = {}) {
    return this.setActiveItem(
      itemId,
      options
    );
  }

  /**
   * Returns the active item.
   *
   * @returns {object|null}
   */
  getActiveItem() {
    return this.getItem(
      this.activeItemId
    );
  }

  /* ==========================================================
   * 8. Enabled, visible and loading states
   * ==========================================================
   */

  /**
   * Enables or disables one menu item.
   *
   * @param {string} itemId
   * @param {boolean} enabled
   * @param {object} [options]
   * @param {string|null} [options.reason]
   * @param {boolean} [options.render=true]
   * @returns {boolean}
   */
  setItemEnabled(
    itemId,
    enabled,
    options = {}
  ) {
    const item =
      this.getItem(itemId);

    const state =
      this.itemStates.get(itemId);

    if (!item || !state) {
      return false;
    }

    state.enabled =
      Boolean(enabled);

    state.reason =
      state.enabled
        ? null
        : options.reason ||
          this.getDisabledReason(item);

    if (
      !state.enabled &&
      this.activeItemId === itemId
    ) {
      const fallback =
        this.items.find(
          (candidate) =>
            candidate.id !== itemId &&
            candidate.type ===
              MENU_ITEM_TYPE.MODULE &&
            this.isItemEnabled(
              candidate.id
            )
        );

      this.activeItemId =
        fallback?.id || null;
    }

    if (options.render !== false) {
      this.render();
    }

    return true;
  }

  /**
   * Enables one item.
   */
  enableItem(itemId, options = {}) {
    return this.setItemEnabled(
      itemId,
      true,
      options
    );
  }

  /**
   * Disables one item.
   */
  disableItem(itemId, options = {}) {
    return this.setItemEnabled(
      itemId,
      false,
      options
    );
  }

  /**
   * Returns whether one item is enabled.
   */
  isItemEnabled(itemId) {
    return Boolean(
      this.itemStates.get(itemId)
        ?.enabled
    );
  }

  /**
   * Shows or hides one menu item.
   */
  setItemVisible(
    itemId,
    visible,
    options = {}
  ) {
    const state =
      this.itemStates.get(itemId);

    if (!state) {
      return false;
    }

    state.visible =
      Boolean(visible);

    if (options.render !== false) {
      this.render();
    }

    return true;
  }

  /**
   * Sets a loading state for one menu item.
   */
  setItemLoading(
    itemId,
    loading,
    options = {}
  ) {
    const state =
      this.itemStates.get(itemId);

    if (!state) {
      return false;
    }

    state.loading =
      Boolean(loading);

    if (options.render !== false) {
      this.render();
    }

    return true;
  }

  /**
   * Sets or clears an item badge.
   */
  setItemBadge(
    itemId,
    badge,
    options = {}
  ) {
    const state =
      this.itemStates.get(itemId);

    if (!state) {
      return false;
    }

    state.badge =
      badge === null ||
      badge === undefined ||
      badge === ""
        ? null
        : badge;

    if (options.render !== false) {
      this.render();
    }

    return true;
  }

  /* ==========================================================
   * 9. Large Map layout
   * ==========================================================
   */

  /**
   * Toggles the built-in Large Map layout.
   *
   * This method operates on the existing Province map panel. It
   * does not create a second Leaflet map.
   *
   * @param {boolean|null} [expanded]
   * @returns {boolean}
   */
  toggleLargeMapLayout(
    expanded = null
  ) {
    const appShell =
      document.querySelector(
        ".app-shell"
      );

    const mapPanel =
      document.querySelector(
        ".map-panel"
      );

    if (!appShell || !mapPanel) {
      return false;
    }

    const currentlyExpanded =
      appShell.classList.contains(
        "large-map-mode"
      );

    const nextExpanded =
      expanded === null
        ? !currentlyExpanded
        : Boolean(expanded);

    appShell.classList.toggle(
      "large-map-mode",
      nextExpanded
    );

    mapPanel.classList.toggle(
      "is-expanded",
      nextExpanded
    );

    document.body.classList.toggle(
      "fims-large-map-open",
      nextExpanded
    );

    const mapElement =
      document.getElementById(
        this.config.provinceScreen
          ?.elements?.mapContainer ||
        "map"
      );

    if (mapElement) {
      mapElement.setAttribute(
        "aria-expanded",
        String(nextExpanded)
      );
    }

    /*
     * map.js uses ResizeObserver, but explicit resize events also
     * support browsers without ResizeObserver.
     */
    window.setTimeout(() => {
      window.dispatchEvent(
        new Event("resize")
      );
    }, 40);

    return nextExpanded;
  }

  /**
   * Returns whether Large Map layout is active.
   */
  isLargeMapOpen() {
    return document
      .querySelector(".app-shell")
      ?.classList.contains(
        "large-map-mode"
      ) || false;
  }

  /**
   * Closes Large Map layout.
   */
  closeLargeMap() {
    return this.toggleLargeMapLayout(
      false
    );
  }

  /* ==========================================================
   * 10. URL resolution
   * ==========================================================
   */

  /**
   * Resolves an item's configured URL.
   *
   * @param {object} item
   * @returns {string|null}
   */
  resolveItemUrl(item) {
    if (item.url) {
      return String(item.url);
    }

    const moduleConfiguration =
      this.getModuleConfiguration(
        item
      );

    const configuredUrl =
      moduleConfiguration?.url ||
      moduleConfiguration?.href ||
      moduleConfiguration?.page;

    if (configuredUrl) {
      return String(configuredUrl);
    }

    if (
      item.id ===
      MENU_MODULE_ID.ASSESSMENT
    ) {
      return (
        this.config.urls?.fips ||
        this.config.urls?.assessment ||
        this.config.application
          ?.fipsUrl ||
        null
      );
    }

    return null;
  }

  /**
   * Resolves the Exit destination.
   *
   * @returns {string|null}
   */
  resolveExitUrl() {
    const candidates = [
      this.config.urls?.portal,
      this.config.urls?.frims,
      this.config.urls?.home,
      this.config.application?.portalUrl,
      this.config.application?.homeUrl,
      this.config.navigation?.exitUrl,
      this.config.modules?.exit?.url
    ];

    const url =
      candidates.find(
        (candidate) =>
          candidate !== null &&
          candidate !== undefined &&
          String(candidate).trim()
      );

    return url
      ? String(url).trim()
      : null;
  }

  /**
   * Opens a URL safely.
   */
  openUrl(
    url,
    target = "_blank"
  ) {
    if (!url) {
      return false;
    }

    if (target === "_self") {
      window.location.href =
        url;

      return true;
    }

    const opened =
      window.open(
        url,
        target,
        "noopener,noreferrer"
      );

    return Boolean(opened);
  }

  /* ==========================================================
   * 11. Keyboard navigation
   * ==========================================================
   */

  /**
   * Supports Arrow Up/Down, Home, End and Enter/Space.
   *
   * @param {KeyboardEvent} event
   */
  handleContainerKeydown(event) {
    const enabledButtons =
      [...this.buttonElements.values()]
        .filter(
          (button) =>
            !button.disabled &&
            button.offsetParent !== null
        );

    if (enabledButtons.length === 0) {
      return;
    }

    const currentIndex =
      enabledButtons.indexOf(
        document.activeElement
      );

    let nextIndex = currentIndex;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();

        nextIndex =
          currentIndex < 0
            ? 0
            : (
                currentIndex + 1
              ) % enabledButtons.length;

        enabledButtons[
          nextIndex
        ].focus();

        break;

      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();

        nextIndex =
          currentIndex < 0
            ? enabledButtons.length - 1
            : (
                currentIndex - 1 +
                enabledButtons.length
              ) % enabledButtons.length;

        enabledButtons[
          nextIndex
        ].focus();

        break;

      case "Home":
        event.preventDefault();
        enabledButtons[0].focus();
        break;

      case "End":
        event.preventDefault();

        enabledButtons[
          enabledButtons.length - 1
        ].focus();

        break;

      case "Enter":
      case " ":
        if (
          document.activeElement
            ?.matches(
              "[data-menu-item-id]"
            )
        ) {
          event.preventDefault();

          const itemId =
            document.activeElement
              .dataset.menuItemId;

          this.handleItemActivation(
            itemId,
            {
              source:
                MENU_EVENT_SOURCE.KEYBOARD,

              originalEvent:
                event
            }
          );
        }

        break;

      case "Escape":
        if (this.isLargeMapOpen()) {
          event.preventDefault();
          this.closeLargeMap();

          this.emitStatus(
            "Large Map view closed."
          );
        }

        break;

      default:
        break;
    }
  }

  /* ==========================================================
   * 12. Item access and state
   * ==========================================================
   */

  /**
   * Returns one menu item.
   *
   * @param {string} itemId
   * @returns {object|null}
   */
  getItem(itemId) {
    if (
      itemId === null ||
      itemId === undefined
    ) {
      return null;
    }

    const normalized =
      this.normalizeItemId(
        itemId
      );

    return (
      this.items.find(
        (item) =>
          this.normalizeItemId(
            item.id
          ) === normalized
      ) ||
      null
    );
  }

  /**
   * Returns all menu item definitions.
   */
  getItems() {
    return this.items.map(
      (item) => ({
        ...item
      })
    );
  }

  /**
   * Returns the current state of one item.
   */
  getItemState(itemId) {
    const state =
      this.itemStates.get(itemId);

    return state
      ? {
          ...state
        }
      : null;
  }

  /**
   * Returns the full menu state.
   */
  getState() {
    return {
      version:
        MENU_MODULE_VERSION,

      status:
        this.status,

      initialized:
        this.initialized,

      destroyed:
        this.destroyed,

      activeItemId:
        this.activeItemId,

      focusedItemId:
        this.focusedItemId,

      largeMapOpen:
        this.isLargeMapOpen(),

      items:
        this.items.map(
          (item) => ({
            ...item,
            state:
              this.getItemState(
                item.id
              )
          })
        )
    };
  }

  /**
   * Normalizes a menu item ID.
   */
  normalizeItemId(value) {
    return String(value ?? "")
      .trim()
      .toLocaleLowerCase("en")
      .replace(/[^a-z0-9]/g, "");
  }

  /* ==========================================================
   * 13. Status and errors
   * ==========================================================
   */

  /**
   * Emits a menu status message.
   */
  emitStatus(message) {
    try {
      this.callbacks.onStatus(
        String(message)
      );
    } catch (error) {
      if (
        this.config.debug?.enabled
      ) {
        console.warn(
          "[FIMS menu] Status callback failed.",
          error
        );
      }
    }
  }

  /**
   * Handles a menu error.
   */
  handleError(
    message,
    error
  ) {
    const normalizedError =
      error instanceof Error
        ? error
        : new MenuError(
            String(
              error || message
            )
          );

    if (
      this.config.debug?.enabled
    ) {
      console.error(
        `[FIMS menu] ${message}`,
        normalizedError
      );
    }

    try {
      this.callbacks.onError(
        normalizedError,
        {
          message,
          activeItemId:
            this.activeItemId,
          status:
            this.status
        }
      );
    } catch (callbackError) {
      if (
        this.config.debug?.enabled
      ) {
        console.error(
          "[FIMS menu] Error callback failed.",
          callbackError
        );
      }
    }

    this.emitStatus(message);
  }

  /* ==========================================================
   * 14. Cleanup
   * ==========================================================
   */

  /**
   * Destroys the menu manager.
   *
   * @param {object} [options]
   * @param {boolean} [options.clearContainer=true]
   */
  destroy(options = {}) {
    const {
      clearContainer = true
    } = options;

    if (this.destroyed) {
      return;
    }

    if (this.container) {
      this.container.removeEventListener(
        "keydown",
        this.boundKeydownHandler
      );

      if (clearContainer) {
        this.container.replaceChildren();
      }

      this.container.classList.remove(
        "module-menu"
      );
    }

    this.closeLargeMap();

    this.buttonElements.clear();
    this.itemStates.clear();

    this.items = [];

    this.activeItemId = null;
    this.focusedItemId = null;

    this.callbacks = {
      onSelect: () => {},
      onStatus: () => {},
      onError: () => {},
      onLargeMap: null,
      onExit: null
    };

    this.container = null;
    this.containerReference = null;

    this.initialized = false;
    this.destroyed = true;
    this.status = MENU_STATUS.DESTROYED;
  }
}

/* ============================================================
 * 15. Factory functions
 * ============================================================
 */

/**
 * Creates a MenuManager.
 *
 * @param {object} [options]
 * @returns {MenuManager}
 */
export function createMenuManager(
  options = {}
) {
  return new MenuManager(
    options
  );
}

/**
 * Compatibility factory alias.
 */
export function createMenu(
  options = {}
) {
  return createMenuManager(
    options
  );
}

/* ============================================================
 * 16. Ver.1 compatibility functions
 * ============================================================
 */

/**
 * Ver.1-compatible menu renderer.
 *
 * Existing usage:
 *
 *   renderMenu(container, (item) => {
 *     ...
 *   });
 *
 * New usage may pass a third options argument.
 *
 * @param {HTMLElement|string} container
 * @param {Function} onSelect
 * @param {object} [options]
 * @returns {MenuManager}
 */
export function renderMenu(
  container,
  onSelect,
  options = {}
) {
  return new MenuManager({
    ...options,
    container,
    onSelect
  });
}

/**
 * Returns a copy of the old-FIMS menu definition.
 *
 * @returns {object[]}
 */
export function getMenuItems() {
  return MENU_ITEMS.map(
    (item) => ({
      ...item
    })
  );
}

/**
 * Returns one menu definition.
 *
 * @param {string} itemId
 * @returns {object|null}
 */
export function getMenuItem(itemId) {
  const normalized =
    String(itemId ?? "")
      .trim()
      .toLocaleLowerCase("en")
      .replace(/[^a-z0-9]/g, "");

  const item =
    MENU_ITEMS.find(
      (candidate) =>
        String(candidate.id)
          .trim()
          .toLocaleLowerCase("en")
          .replace(/[^a-z0-9]/g, "") ===
        normalized
    );

  return item
    ? {
        ...item
      }
    : null;
}

/* ============================================================
 * 17. Error classes
 * ============================================================
 */

/**
 * Base menu error.
 */
export class MenuError extends Error {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      options
    );

    this.name = "MenuError";

    this.code =
      options.code ||
      "MENU_ERROR";

    this.details =
      options.details ||
      null;
  }
}

/**
 * Menu initialization error.
 */
export class MenuInitializationError
  extends MenuError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        ...options,
        code:
          options.code ||
          "MENU_INITIALIZATION_ERROR"
      }
    );

    this.name =
      "MenuInitializationError";
  }
}

/**
 * Menu action error.
 */
export class MenuActionError
  extends MenuError {
  constructor(
    message,
    options = {}
  ) {
    super(
      message,
      {
        ...options,
        code:
          options.code ||
          "MENU_ACTION_ERROR"
      }
    );

    this.name =
      "MenuActionError";
  }
}

/* ============================================================
 * 18. Default export
 * ============================================================
 */

export default MenuManager;

/**
 * ============================================================
 * End of menu.js Ver.2.0
 * ============================================================
 */

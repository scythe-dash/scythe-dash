import { VisibleElements } from "./VisibleElements";

type Direction = "left" | "right" | "up" | "down";

type NavigationMode = "closestByDirection" | "closestByDistance";

type EnterTo = "calculated" | "lastFocused" | "defaultElement";

type SectionType = "arbitrary" | "row" | "column";

export type CandidatesLookUpPriority = "all" | "visibleFirst";

type AllowedSectors = Record<Direction, number>;

type LeaveEvent = {
  direction: Direction;
  rootElement: HTMLElement;
  previousElement: HTMLElement;
  nextElement: HTMLElement;
  sectionNamesMap: Map<string, FastNavigationSection>;
};
interface OnSectionLeave {
  (event: LeaveEvent): boolean;
}

interface OnSectionEnter {
  (rootElement: HTMLElement, nextElement: HTMLElement): void;
}

interface FilterByAngle {
  (angleInDegrees: number, allowedSectorAngle: number): boolean;
}

type FastSectionConfig = {
  navigationMode: NavigationMode;
  onSectionLeave: OnSectionLeave;
  onSectionEnter: OnSectionEnter;
  getDefaultElement(sectionRoot: HTMLElement): HTMLElement | null;
  enterTo: EnterTo;
  sectionType: SectionType;
  allowedAngles: AllowedSectors;
  handleRepeat: boolean;
};

type FilteringObject = {
  minimalDistanceAlongDirection: number;
  minimalDistance: number;
  filterFunction(xx: number, yy: number, distance: number): boolean;
  resetMinimalValues(): void;
};

const KEY_CODE_TO_DIRECTION_MAPPING: Record<string, Direction> = {
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
};

const DIRECTION_TO_EVENT_INIT_MAPPING: Record<Direction, KeyboardEventInit> = {
  down: {
    bubbles: true,
    code: "ArrowDown",
    key: "ArrowDown",
    repeat: false,
  },
  left: {
    bubbles: true,
    code: "ArrowLeft",
    key: "ArrowLeft",
    repeat: false,
  },
  right: {
    bubbles: true,
    code: "ArrowRight",
    key: "ArrowRight",
    repeat: false,
  },
  up: {
    bubbles: true,
    code: "ArrowUp",
    key: "ArrowUp",
    repeat: false,
  },
};

const RADIANS_TO_DEGREE_CONVERTING_MULTIPLIER = 180 / Math.PI;

const PREVENT_SCROLL = { preventScroll: true };

const FILTERING_OBJECT_MAPPING: Record<`${Direction}-${NavigationMode}`, FilteringObject> = {
  "left-closestByDistance": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      if (distance < this.minimalDistance) {
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
  "left-closestByDirection": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      const absXX = Math.abs(xx);

      if (absXX <= this.minimalDistanceAlongDirection && distance <= this.minimalDistance) {
        this.minimalDistanceAlongDirection = absXX;
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
  "right-closestByDistance": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      if (distance < this.minimalDistance) {
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
  "right-closestByDirection": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      if (xx <= this.minimalDistanceAlongDirection && distance <= this.minimalDistance) {
        this.minimalDistanceAlongDirection = xx;
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
  "up-closestByDistance": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      if (distance < this.minimalDistance) {
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
  "up-closestByDirection": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      const absYY = Math.abs(yy);

      if (absYY <= this.minimalDistanceAlongDirection && distance <= this.minimalDistance) {
        this.minimalDistanceAlongDirection = absYY;
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
  "down-closestByDistance": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      if (distance < this.minimalDistance) {
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
  "down-closestByDirection": {
    minimalDistanceAlongDirection: Infinity,
    minimalDistance: Infinity,
    filterFunction(xx, yy, distance) {
      if (yy <= this.minimalDistanceAlongDirection && distance <= this.minimalDistance) {
        this.minimalDistanceAlongDirection = yy;
        this.minimalDistance = distance;

        return true;
      }

      return false;
    },
    resetMinimalValues() {
      this.minimalDistanceAlongDirection = Infinity;
      this.minimalDistance = Infinity;
    },
  },
} as const;

const SECTOR_ANGLE_MAPPING: Record<Direction, FilterByAngle> = {
  down(angleInDegrees, halfOfAllowedSectorAngle) {
    return angleInDegrees < 90 + halfOfAllowedSectorAngle && angleInDegrees > 90 - halfOfAllowedSectorAngle;
  },
  left(angleInDegrees, halfOfAllowedSectorAngle) {
    return angleInDegrees < -180 + halfOfAllowedSectorAngle || angleInDegrees > 180 - halfOfAllowedSectorAngle;
  },
  right(angleInDegrees, halfOfAllowedSectorAngle) {
    return angleInDegrees < halfOfAllowedSectorAngle && angleInDegrees > -halfOfAllowedSectorAngle;
  },
  up(angleInDegrees, halfOfAllowedSectorAngle) {
    return angleInDegrees < -90 + halfOfAllowedSectorAngle && angleInDegrees > -90 - halfOfAllowedSectorAngle;
  },
};

function getNull() {
  return null;
}

function getTrue() {
  return true;
}

function noop() {
  // noop k
}

function getNextElement(element: Element): HTMLElement | null {
  return element.nextElementSibling as HTMLElement | null;
}

function getPreviousElement(element: Element): HTMLElement | null {
  return element.previousElementSibling as HTMLElement | null;
}

const SIMPLE_SECTION_FUNCTION_MAPPING: Record<`${SectionType}-${Direction}`, (element: Element) => HTMLElement | null> =
  {
    "arbitrary-down": getNull,
    "arbitrary-left": getNull,
    "arbitrary-right": getNull,
    "arbitrary-up": getNull,
    "row-up": getNull,
    "row-down": getNull,
    "column-left": getNull,
    "column-right": getNull,
    "row-right": getNextElement,
    "column-down": getNextElement,
    "row-left": getPreviousElement,
    "column-up": getPreviousElement,
  } as const;

function findClosest(
  activeElement: Element,
  collection: HTMLCollection | Set<HTMLElement>,
  direction: Direction,
  mode: NavigationMode,
  allowedSectorAngles: AllowedSectors
): HTMLElement | null {
  const activeElementRect = activeElement.getBoundingClientRect();

  const activeElementCenterPointX = activeElementRect.left + Math.floor(activeElementRect.width / 2);
  const activeElementCenterPointy = activeElementRect.top + Math.floor(activeElementRect.height / 2);

  const filteringObject = FILTERING_OBJECT_MAPPING[`${direction}-${mode}`];

  const halfOfAllowedSectorAngle = allowedSectorAngles[direction] / 2;

  const filterByAngle = SECTOR_ANGLE_MAPPING[direction];

  let closestCandidate: Element | null = null;

  for (const candidate of collection) {
    if (candidate.getAttribute("disabled") !== "true") {
      const candidateRect = candidate.getBoundingClientRect();

      const candidateCenterPointX = candidateRect.left + Math.floor(candidateRect.width / 2);
      const candidateCenterPointY = candidateRect.top + Math.floor(candidateRect.height / 2);

      const xCoordinateVectorComponent = candidateCenterPointX - activeElementCenterPointX;
      const yCoordinateVectorComponent = candidateCenterPointY - activeElementCenterPointy;

      const distance = Math.hypot(xCoordinateVectorComponent, yCoordinateVectorComponent);

      if (
        distance > 0 &&
        filterByAngle(
          Math.atan2(yCoordinateVectorComponent, xCoordinateVectorComponent) * RADIANS_TO_DEGREE_CONVERTING_MULTIPLIER,
          halfOfAllowedSectorAngle
        ) &&
        filteringObject.filterFunction(xCoordinateVectorComponent, yCoordinateVectorComponent, distance)
      ) {
        closestCandidate = candidate;
      }
    }
  }

  filteringObject.resetMinimalValues();

  return closestCandidate as HTMLElement | null;
}

function focusElement(element?: HTMLElement | null, t?: number): void {
  element && element.focus(PREVENT_SCROLL);

  t && console.log(performance.now() - t);
}

let collection: HTMLCollection | null = null;

function getFocusableCollection(): HTMLCollection {
  return collection || (collection = document.getElementsByClassName("sn-section-item"));
}

function getFirstFocusableElement(): HTMLElement | null {
  return getFocusableCollection().item(0) as HTMLElement | null;
}

export class FastNavigationSection {
  constructor(sectionsMap: WeakMap<Element, FastNavigationSection>, namesMap: Map<string, FastNavigationSection>) {
    this.sectionsMap = sectionsMap;
    this.namesMap = namesMap;
  }

  private config: FastSectionConfig = {
    allowedAngles: FastNavigationSection.defaultConfig.allowedAngles,
    enterTo: FastNavigationSection.defaultConfig.enterTo,
    getDefaultElement: FastNavigationSection.defaultConfig.getDefaultElement,
    handleRepeat: FastNavigationSection.defaultConfig.handleRepeat,
    navigationMode: FastNavigationSection.defaultConfig.navigationMode,
    onSectionEnter: FastNavigationSection.defaultConfig.onSectionEnter,
    onSectionLeave: FastNavigationSection.defaultConfig.onSectionLeave,
    sectionType: FastNavigationSection.defaultConfig.sectionType,
  };
  private lastFocused: HTMLElement | null = null;
  private rootElement: HTMLElement | null = null;
  private sectionsMap: WeakMap<Element, FastNavigationSection>;
  private namesMap: Map<string, FastNavigationSection>;

  public customize(config: Partial<FastSectionConfig>): void {
    this.config.allowedAngles = config.allowedAngles || FastNavigationSection.defaultConfig.allowedAngles;
    this.config.enterTo = config.enterTo || FastNavigationSection.defaultConfig.enterTo;
    this.config.getDefaultElement = config.getDefaultElement || FastNavigationSection.defaultConfig.getDefaultElement;
    this.config.handleRepeat = config.handleRepeat || FastNavigationSection.defaultConfig.handleRepeat;
    this.config.navigationMode = config.navigationMode || FastNavigationSection.defaultConfig.navigationMode;
    this.config.onSectionEnter = config.onSectionEnter || FastNavigationSection.defaultConfig.onSectionEnter;
    this.config.onSectionLeave = config.onSectionLeave || FastNavigationSection.defaultConfig.onSectionLeave;
    this.config.sectionType = config.sectionType || FastNavigationSection.defaultConfig.sectionType;
  }

  public setRoot(element: HTMLElement): void {
    this.rootElement = element;
  }

  private get defaultElement(): HTMLElement | null {
    return this.rootElement && this.config.getDefaultElement(this.rootElement);
  }

  private get calculated(): HTMLElement | null {
    return (
      this.rootElement && (this.rootElement.getElementsByClassName("sn-section-item").item(0) as HTMLElement | null)
    );
  }

  public focusSection(nextElement?: HTMLElement): void {
    if (this.rootElement && nextElement && this.rootElement.contains(nextElement)) {
      focusElement(nextElement);

      return;
    }

    focusElement(this[this.config.enterTo]);
  }

  private handleFocusOnSection(event: FocusEvent): void {
    const element = event.target;
    const rootElement = event.currentTarget as HTMLElement;

    const elementIsFocusable = element instanceof HTMLElement && element.classList.contains("sn-section-item");

    if (!elementIsFocusable) {
      return;
    }

    this.lastFocused = element;

    if (typeof this.config.onSectionEnter !== "function") {
      return;
    }

    this.config.onSectionEnter(rootElement, element);
  }

  private handleKeyboardNavigation(event: KeyboardEvent): boolean {
    const startTime = performance.now();

    if (this.config.handleRepeat === false && event.repeat === true) {
      event.preventDefault();
      event.stopImmediatePropagation();

      return false;
    }

    const rootElement = event.currentTarget as HTMLElement;
    const activeElement = event.target as HTMLElement;

    const direction = KEY_CODE_TO_DIRECTION_MAPPING[event.code || event.key];

    if (typeof direction !== "string") {
      event.preventDefault();
      event.stopImmediatePropagation();

      return false;
    }

    const getNextSimpleElement = SIMPLE_SECTION_FUNCTION_MAPPING[`${this.config.sectionType}-${direction}`];

    const nextElementFromSimpleNavigation = getNextSimpleElement(activeElement);

    if (nextElementFromSimpleNavigation !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();

      focusElement(nextElementFromSimpleNavigation, startTime);

      return false;
    }

    const nextElement =
      findClosest(
        activeElement,
        FastNavigationSection.getCandidates(FastNavigationSection.candidatesLookUpPriority),
        direction,
        this.config.navigationMode,
        this.config.allowedAngles
      ) ||
      findClosest(
        activeElement,
        FastNavigationSection.getCandidates("all"),
        direction,
        this.config.navigationMode,
        this.config.allowedAngles
      );

    if (nextElement === null) {
      event.preventDefault();
      event.stopImmediatePropagation();

      return false;
    }

    const nextIsInTheSameSection = rootElement.contains(nextElement);

    if (nextIsInTheSameSection === true) {
      event.preventDefault();
      event.stopImmediatePropagation();

      focusElement(nextElement, startTime);

      return false;
    }

    const needToFocusNextElement = this.config.onSectionLeave({
      direction,
      rootElement,
      previousElement: activeElement,
      nextElement,
      sectionNamesMap: this.namesMap,
    });

    if (needToFocusNextElement === false) {
      event.preventDefault();
      event.stopImmediatePropagation();

      return false;
    }

    const rootElementOfNextElement = nextElement.closest(".sn-section-root");

    if (rootElementOfNextElement === null) {
      event.preventDefault();
      event.stopImmediatePropagation();

      focusElement(nextElement, startTime);

      return false;
    }

    const sectionOfNextElement = this.sectionsMap.get(rootElementOfNextElement);

    if (typeof sectionOfNextElement === "undefined") {
      event.preventDefault();
      event.stopImmediatePropagation();

      focusElement(nextElement, startTime);

      return false;
    }

    const { enterTo } = sectionOfNextElement.config;

    if (enterTo === "lastFocused" || enterTo === "defaultElement") {
      event.preventDefault();
      event.stopImmediatePropagation();

      focusElement(sectionOfNextElement[enterTo] || nextElement, startTime);
      return false;
    }

    event.stopImmediatePropagation();
    event.preventDefault();

    focusElement(nextElement, startTime);

    return false;
  }

  private _onKeyDown = this.handleKeyboardNavigation.bind(this);

  private _onFocus = this.handleFocusOnSection.bind(this);

  get onKeyDown(): typeof this._onKeyDown {
    return this._onKeyDown;
  }

  get onFocus(): typeof this._onFocus {
    return this._onFocus;
  }

  public static navigate(direction: Direction): void {
    const { activeElement } = document;

    if (activeElement === null) {
      return;
    }

    if (activeElement === document.body) {
      focusElement(getFirstFocusableElement());

      return;
    }

    activeElement.dispatchEvent(new KeyboardEvent("keydown", DIRECTION_TO_EVENT_INIT_MAPPING[direction]));
  }

  public static handleSectionlessNavigation(event: KeyboardEvent): boolean {
    const startTime = performance.now();

    if (FastNavigationSection.defaultConfig.handleRepeat === false && event.repeat === true) {
      event.preventDefault();

      return false;
    }

    const activeElement = event.target as HTMLElement;

    const direction = KEY_CODE_TO_DIRECTION_MAPPING[event.code || event.key];

    if (typeof direction !== "string") {
      event.preventDefault();

      return false;
    }

    if (activeElement === document.body) {
      event.preventDefault();

      focusElement(getFirstFocusableElement(), startTime);

      return false;
    }

    const nextElement =
      findClosest(
        activeElement,
        FastNavigationSection.getCandidates(FastNavigationSection.candidatesLookUpPriority),
        direction,
        FastNavigationSection.defaultConfig.navigationMode,
        FastNavigationSection.defaultConfig.allowedAngles
      ) ||
      findClosest(
        activeElement,
        FastNavigationSection.getCandidates("all"),
        direction,
        FastNavigationSection.defaultConfig.navigationMode,
        FastNavigationSection.defaultConfig.allowedAngles
      );

    if (nextElement === null) {
      return false;
    }

    event.preventDefault();

    focusElement(nextElement, startTime);

    return false;
  }

  private static visibleItems: Set<HTMLElement> = VisibleElements.items;

  private static candidatesLookUpPriority: CandidatesLookUpPriority = "visibleFirst";

  public static setCandidatesSearchType(priority: CandidatesLookUpPriority): void {
    this.candidatesLookUpPriority = priority;
  }

  private static getCandidates(priority: CandidatesLookUpPriority): Set<HTMLElement> | HTMLCollection {
    if (priority === "visibleFirst") {
      return this.visibleItems.size > 0 ? this.visibleItems : getFocusableCollection();
    }

    return getFocusableCollection();
  }

  private static defaultConfig: FastSectionConfig = {
    allowedAngles: {
      down: 180,
      left: 180,
      right: 180,
      up: 180,
    },
    enterTo: "calculated",
    getDefaultElement: getNull,
    handleRepeat: true,
    navigationMode: "closestByDistance",
    onSectionEnter: noop,
    onSectionLeave: getTrue,
    sectionType: "arbitrary",
  };

  public static customize(config: Partial<FastSectionConfig>): void {
    FastNavigationSection.defaultConfig.allowedAngles =
      config.allowedAngles || FastNavigationSection.defaultConfig.allowedAngles;

    FastNavigationSection.defaultConfig.enterTo = config.enterTo || FastNavigationSection.defaultConfig.enterTo;

    FastNavigationSection.defaultConfig.getDefaultElement =
      config.getDefaultElement || FastNavigationSection.defaultConfig.getDefaultElement;

    FastNavigationSection.defaultConfig.handleRepeat =
      config.handleRepeat || FastNavigationSection.defaultConfig.handleRepeat;

    FastNavigationSection.defaultConfig.navigationMode =
      config.navigationMode || FastNavigationSection.defaultConfig.navigationMode;

    FastNavigationSection.defaultConfig.onSectionEnter =
      config.onSectionEnter || FastNavigationSection.defaultConfig.onSectionEnter;

    FastNavigationSection.defaultConfig.onSectionLeave =
      config.onSectionLeave || FastNavigationSection.defaultConfig.onSectionLeave;

    FastNavigationSection.defaultConfig.sectionType =
      config.sectionType || FastNavigationSection.defaultConfig.sectionType;
  }
}

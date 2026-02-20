// EditContext API type declarations (Chromium 121+)
// https://developer.mozilla.org/en-US/docs/Web/API/EditContext_API

interface EditContextInit {
  text?: string;
  selectionStart?: number;
  selectionEnd?: number;
}

interface TextFormat {
  rangeStart: number;
  rangeEnd: number;
  underlineStyle: "none" | "solid" | "dotted" | "dashed" | "wavy" | "squiggle";
  underlineThickness: "none" | "thin" | "thick";
}

interface TextUpdateEvent extends Event {
  readonly updateRangeStart: number;
  readonly updateRangeEnd: number;
  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

interface TextFormatUpdateEvent extends Event {
  getTextFormats(): TextFormat[];
}

interface CharacterBoundsUpdateEvent extends Event {
  readonly rangeStart: number;
  readonly rangeEnd: number;
}

interface EditContextEventMap {
  textupdate: TextUpdateEvent;
  textformatupdate: TextFormatUpdateEvent;
  characterboundsupdate: CharacterBoundsUpdateEvent;
  compositionstart: CompositionEvent;
  compositionend: CompositionEvent;
}

declare class EditContext extends EventTarget {
  constructor(init?: EditContextInit);

  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly characterBoundsRangeStart: number;

  updateText(start: number, end: number, newText: string): void;
  updateSelection(start: number, end: number): void;
  updateControlBounds(controlBounds: DOMRect): void;
  updateSelectionBounds(selectionBounds: DOMRect): void;
  updateCharacterBounds(
    rangeStart: number,
    characterBounds: DOMRect[],
  ): void;
  characterBounds(): DOMRect[];
  attachedElements(): HTMLElement[];

  addEventListener<K extends keyof EditContextEventMap>(
    type: K,
    listener: (ev: EditContextEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener<K extends keyof EditContextEventMap>(
    type: K,
    listener: (ev: EditContextEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

interface HTMLElement {
  editContext: EditContext | null;
}

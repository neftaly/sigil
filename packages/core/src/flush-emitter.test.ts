import { describe, expect, it, vi } from "vitest";

import { type FlushSnapshot, createFlushEmitter } from "./flush-emitter.ts";
import { createDatabase } from "./database.ts";
import { createEventState } from "./events.ts";
import { createOverlayState } from "./overlays.ts";

function makeSnapshot(grid?: FlushSnapshot["grid"]): FlushSnapshot {
  return {
    database: createDatabase(),
    grid: grid ?? [[{ char: " ", style: {} }]],
    overlayState: createOverlayState(),
    eventState: createEventState(),
  };
}

describe("createFlushEmitter", () => {
  it("delivers emitted snapshot to subscriber", () => {
    const emitter = createFlushEmitter();
    const cb = vi.fn();
    emitter.subscribe(cb);

    const snapshot = makeSnapshot();
    emitter.emit(snapshot);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(snapshot);
  });

  it("delivers to multiple subscribers", () => {
    const emitter = createFlushEmitter();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    emitter.subscribe(cb1);
    emitter.subscribe(cb2);

    const snapshot = makeSnapshot();
    emitter.emit(snapshot);

    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops delivery", () => {
    const emitter = createFlushEmitter();
    const cb = vi.fn();
    const unsub = emitter.subscribe(cb);

    emitter.emit(makeSnapshot());
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();
    emitter.emit(makeSnapshot());
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("replays latest snapshot to new subscriber", () => {
    const emitter = createFlushEmitter();
    const snapshot = makeSnapshot();
    emitter.emit(snapshot);

    const cb = vi.fn();
    emitter.subscribe(cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(snapshot);
  });

  it("does not replay if nothing has been emitted", () => {
    const emitter = createFlushEmitter();
    const cb = vi.fn();
    emitter.subscribe(cb);

    expect(cb).not.toHaveBeenCalled();
  });

  it("replays the most recent snapshot, not earlier ones", () => {
    const emitter = createFlushEmitter();
    const first = makeSnapshot([[{ char: "a", style: {} }]]);
    const second = makeSnapshot([[{ char: "b", style: {} }]]);
    emitter.emit(first);
    emitter.emit(second);

    const cb = vi.fn();
    emitter.subscribe(cb);

    expect(cb).toHaveBeenCalledWith(second);
  });

  it("prevents re-entrant emit", () => {
    const emitter = createFlushEmitter();
    const outer = makeSnapshot([[{ char: "1", style: {} }]]);
    const inner = makeSnapshot([[{ char: "2", style: {} }]]);
    const fn = vi.fn();

    emitter.subscribe((snapshot) => {
      fn(snapshot);
      // Re-entrant emit should be silently ignored
      emitter.emit(inner);
    });

    emitter.emit(outer);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(outer);
  });
});

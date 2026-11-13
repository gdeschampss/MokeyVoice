/** Emissor de eventos tipado e minúsculo. */
export class Emitter<Events extends { [K in keyof Events]: unknown }> {
  private handlers = new Map<keyof Events, Set<(p: never) => void>>();

  on<E extends keyof Events>(event: E, handler: (payload: Events[E]) => void): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as (p: never) => void);
    return () => set!.delete(handler as (p: never) => void);
  }

  emit<E extends keyof Events>(event: E, payload: Events[E]) {
    this.handlers.get(event)?.forEach((h) => (h as (p: Events[E]) => void)(payload));
  }

  clear() {
    this.handlers.clear();
  }
}

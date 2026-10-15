// Minimal stand-ins for the two @angular/core symbols qurantext.service.ts uses.
export function Injectable(_options?: unknown) {
  return (target: unknown) => target;
}
export class InjectionToken<T> {
  constructor(public readonly description: string) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly _type?: T;
}

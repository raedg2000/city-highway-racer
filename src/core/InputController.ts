export interface PointerClick {
  readonly clientX: number;
  readonly clientY: number;
}

export class InputController {
  private readonly pressedKeys = new Set<string>();
  private readonly physicalPressedKeys = new Set<string>();
  private readonly justPressedKeys = new Set<string>();
  private readonly virtualKeyHoldCounts = new Map<string, number>();
  private readonly activeVirtualPointers = new Map<number, string>();
  private readonly virtualControlCleanups: Array<() => void> = [];
  private pointerClick: PointerClick | null = null;

  public constructor(private readonly target: Window = window) {
    this.target.addEventListener('keydown', this.onKeyDown);
    this.target.addEventListener('keyup', this.onKeyUp);
    this.target.addEventListener('pointerdown', this.onPointerDown);
  }

  public bindVirtualControls(rootElement: HTMLElement): void {
    const controls = Array.from(rootElement.querySelectorAll<HTMLElement>('[data-game-key]'));

    for (const control of controls) {
      const key = control.dataset.gameKey;
      if (!key) continue;

      const onPointerDown = (event: PointerEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        this.pointerClick = null;
        control.setPointerCapture?.(event.pointerId);
        this.pressVirtualKey(key, event.pointerId);
      };

      const onPointerUp = (event: PointerEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        this.releaseVirtualKey(event.pointerId);
      };

      control.addEventListener('pointerdown', onPointerDown, { passive: false });
      control.addEventListener('pointerup', onPointerUp, { passive: false });
      control.addEventListener('pointercancel', onPointerUp, { passive: false });
      control.addEventListener('lostpointercapture', onPointerUp, { passive: false });
      control.addEventListener('contextmenu', this.preventDefaultEvent);

      this.virtualControlCleanups.push(() => {
        control.removeEventListener('pointerdown', onPointerDown);
        control.removeEventListener('pointerup', onPointerUp);
        control.removeEventListener('pointercancel', onPointerUp);
        control.removeEventListener('lostpointercapture', onPointerUp);
        control.removeEventListener('contextmenu', this.preventDefaultEvent);
      });
    }
  }

  public destroy(): void {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('pointerdown', this.onPointerDown);

    for (const cleanup of this.virtualControlCleanups) cleanup();
    this.virtualControlCleanups.length = 0;
    this.activeVirtualPointers.clear();
    this.virtualKeyHoldCounts.clear();
    this.pressedKeys.clear();
    this.physicalPressedKeys.clear();
    this.justPressedKeys.clear();
    this.pointerClick = null;
  }

  public isPressed(...keys: readonly string[]): boolean {
    return keys.some((key) => this.pressedKeys.has(key));
  }

  public consumePressed(...keys: readonly string[]): boolean {
    const wasPressed = keys.some((key) => this.justPressedKeys.has(key));
    for (const key of keys) this.justPressedKeys.delete(key);
    return wasPressed;
  }

  public getPointerClick(): PointerClick | null {
    return this.pointerClick;
  }

  public clearPointerClick(): void {
    this.pointerClick = null;
  }

  public consumePointerClick(): boolean {
    const wasClicked = this.pointerClick !== null;
    this.pointerClick = null;
    return wasClicked;
  }

  public consumePointerClickPoint(): PointerClick | null {
    const click = this.pointerClick;
    this.pointerClick = null;
    return click;
  }

  public endFrame(): void {
    this.justPressedKeys.clear();
    this.pointerClick = null;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.shouldPreventBrowserShortcut(event.key)) event.preventDefault();
    if (!this.pressedKeys.has(event.key)) this.justPressedKeys.add(event.key);
    this.physicalPressedKeys.add(event.key);
    this.pressedKeys.add(event.key);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (this.shouldPreventBrowserShortcut(event.key)) event.preventDefault();
    this.physicalPressedKeys.delete(event.key);
    if (!this.hasVirtualHold(event.key)) this.pressedKeys.delete(event.key);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.target instanceof HTMLElement && event.target.closest('[data-game-key]')) return;
    this.pointerClick = { clientX: event.clientX, clientY: event.clientY };
  };

  private readonly preventDefaultEvent = (event: Event): void => {
    event.preventDefault();
  };

  private pressVirtualKey(key: string, pointerId: number): void {
    if (!this.pressedKeys.has(key)) this.justPressedKeys.add(key);

    this.activeVirtualPointers.set(pointerId, key);
    this.virtualKeyHoldCounts.set(key, (this.virtualKeyHoldCounts.get(key) ?? 0) + 1);
    this.pressedKeys.add(key);
  }

  private releaseVirtualKey(pointerId: number): void {
    const key = this.activeVirtualPointers.get(pointerId);
    if (!key) return;

    this.activeVirtualPointers.delete(pointerId);
    const nextHoldCount = Math.max(0, (this.virtualKeyHoldCounts.get(key) ?? 1) - 1);

    if (nextHoldCount === 0) {
      this.virtualKeyHoldCounts.delete(key);
      if (!this.physicalPressedKeys.has(key)) this.pressedKeys.delete(key);
      return;
    }

    this.virtualKeyHoldCounts.set(key, nextHoldCount);
  }

  private hasVirtualHold(key: string): boolean {
    return (this.virtualKeyHoldCounts.get(key) ?? 0) > 0;
  }

  private shouldPreventBrowserShortcut(key: string): boolean {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(key);
  }
}

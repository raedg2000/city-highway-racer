export class InputController {
    target;
    pressedKeys = new Set();
    physicalPressedKeys = new Set();
    justPressedKeys = new Set();
    virtualKeyHoldCounts = new Map();
    activeVirtualPointers = new Map();
    virtualControlCleanups = [];
    pointerClick = null;
    constructor(target = window) {
        this.target = target;
        this.target.addEventListener('keydown', this.onKeyDown);
        this.target.addEventListener('keyup', this.onKeyUp);
        this.target.addEventListener('pointerdown', this.onPointerDown);
    }
    bindVirtualControls(rootElement) {
        const controls = Array.from(rootElement.querySelectorAll('[data-game-key]'));
        for (const control of controls) {
            const key = control.dataset.gameKey;
            if (!key)
                continue;
            const onPointerDown = (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.pointerClick = null;
                control.setPointerCapture?.(event.pointerId);
                this.pressVirtualKey(key, event.pointerId);
            };
            const onPointerUp = (event) => {
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
    destroy() {
        this.target.removeEventListener('keydown', this.onKeyDown);
        this.target.removeEventListener('keyup', this.onKeyUp);
        this.target.removeEventListener('pointerdown', this.onPointerDown);
        for (const cleanup of this.virtualControlCleanups)
            cleanup();
        this.virtualControlCleanups.length = 0;
        this.activeVirtualPointers.clear();
        this.virtualKeyHoldCounts.clear();
        this.pressedKeys.clear();
        this.physicalPressedKeys.clear();
        this.justPressedKeys.clear();
        this.pointerClick = null;
    }
    isPressed(...keys) {
        return keys.some((key) => this.pressedKeys.has(key));
    }
    consumePressed(...keys) {
        const wasPressed = keys.some((key) => this.justPressedKeys.has(key));
        for (const key of keys)
            this.justPressedKeys.delete(key);
        return wasPressed;
    }
    getPointerClick() {
        return this.pointerClick;
    }
    clearPointerClick() {
        this.pointerClick = null;
    }
    consumePointerClick() {
        const wasClicked = this.pointerClick !== null;
        this.pointerClick = null;
        return wasClicked;
    }
    consumePointerClickPoint() {
        const click = this.pointerClick;
        this.pointerClick = null;
        return click;
    }
    endFrame() {
        this.justPressedKeys.clear();
        this.pointerClick = null;
    }
    onKeyDown = (event) => {
        if (this.shouldPreventBrowserShortcut(event.key))
            event.preventDefault();
        if (!this.pressedKeys.has(event.key))
            this.justPressedKeys.add(event.key);
        this.physicalPressedKeys.add(event.key);
        this.pressedKeys.add(event.key);
    };
    onKeyUp = (event) => {
        if (this.shouldPreventBrowserShortcut(event.key))
            event.preventDefault();
        this.physicalPressedKeys.delete(event.key);
        if (!this.hasVirtualHold(event.key))
            this.pressedKeys.delete(event.key);
    };
    onPointerDown = (event) => {
        if (event.target instanceof HTMLElement && event.target.closest('[data-game-key]'))
            return;
        this.pointerClick = { clientX: event.clientX, clientY: event.clientY };
    };
    preventDefaultEvent = (event) => {
        event.preventDefault();
    };
    pressVirtualKey(key, pointerId) {
        if (!this.pressedKeys.has(key))
            this.justPressedKeys.add(key);
        this.activeVirtualPointers.set(pointerId, key);
        this.virtualKeyHoldCounts.set(key, (this.virtualKeyHoldCounts.get(key) ?? 0) + 1);
        this.pressedKeys.add(key);
    }
    releaseVirtualKey(pointerId) {
        const key = this.activeVirtualPointers.get(pointerId);
        if (!key)
            return;
        this.activeVirtualPointers.delete(pointerId);
        const nextHoldCount = Math.max(0, (this.virtualKeyHoldCounts.get(key) ?? 1) - 1);
        if (nextHoldCount === 0) {
            this.virtualKeyHoldCounts.delete(key);
            if (!this.physicalPressedKeys.has(key))
                this.pressedKeys.delete(key);
            return;
        }
        this.virtualKeyHoldCounts.set(key, nextHoldCount);
    }
    hasVirtualHold(key) {
        return (this.virtualKeyHoldCounts.get(key) ?? 0) > 0;
    }
    shouldPreventBrowserShortcut(key) {
        return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(key);
    }
}

/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ElementRef, NgZone} from '@angular/core';
import {Direction} from '@angular/cdk/bidi';
import {coerceElement} from '@angular/cdk/coercion';
import {ViewportRuler} from '@angular/cdk/scrolling';
import {_supportsShadowDom} from '@angular/cdk/platform';
import {Subject, Subscription, interval, animationFrameScheduler} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {moveItemInArray} from './drag-utils';
import {DragDropRegistry} from './drag-drop-registry';
import {DragRefInternal as DragRef, Point} from './drag-ref';

/** Counter used to generate unique ids for drop refs. */
let _uniqueIdCounter = 0;

/**
 * Proximity, as a ratio to width/height, at which a
 * dragged item will affect the drop container.
 */
const DROP_PROXIMITY_THRESHOLD = 0.05;

/**
 * Proximity, as a ratio to width/height at which to start auto-scrolling the drop list or the
 * viewport. The value comes from trying it out manually until it feels right.
 */
const SCROLL_PROXIMITY_THRESHOLD = 0.05;

/**
 * Number of pixels to scroll for each frame when auto-scrolling an element.
 * The value comes from trying it out manually until it feels right.
 */
const AUTO_SCROLL_STEP = 2;

/**
 * Entry in the position cache for draggable items.
 * @docs-private
 */
interface CachedItemPosition {
  /** Instance of the drag item. */
  drag: DragRef;
  /** Dimensions of the item. */
  clientRect: ClientRect;
  /** Amount by which the item has been moved since dragging started. */
  offset: number;
}

/** Object holding the scroll position of something. */
interface ScrollPosition {
  top: number;
  left: number;
}

/** Vertical direction in which we can auto-scroll. */
const enum AutoScrollVerticalDirection {NONE, UP, DOWN}

/** Horizontal direction in which we can auto-scroll. */
const enum AutoScrollHorizontalDirection {NONE, LEFT, RIGHT}

/**
 * Internal compile-time-only representation of a `DropListRef`.
 * Used to avoid circular import issues between the `DropListRef` and the `DragRef`.
 * @docs-private
 */
export interface DropListRefInternal extends DropListRef {}

/**
 * Reference to a drop list. Used to manipulate or dispose of the container.
 * @docs-private
 */
export class DropListRef<T = any> {
  /** Element that the drop list is attached to. */
  element: HTMLElement | ElementRef<HTMLElement>;

  /**
   * Unique ID for the drop list.
   * @deprecated No longer being used. To be removed.
   * @breaking-change 8.0.0
   */
  id = `cdk-drop-list-ref-${_uniqueIdCounter++}`;

  /** Whether starting a dragging sequence from this container is disabled. */
  disabled: boolean = false;

  /** Whether sorting items within the list is disabled. */
  sortingDisabled: boolean = false;

  /** Locks the position of the draggable elements inside the container along the specified axis. */
  lockAxis: 'x' | 'y';

  /**
   * Whether auto-scrolling the view when the user
   * moves their pointer close to the edges is disabled.
   */
  autoScrollDisabled: boolean = false;

  /**
   * Function that is used to determine whether an item
   * is allowed to be moved into a drop container.
   */
  enterPredicate: (drag: DragRef, drop: DropListRef) => boolean = () => true;

  /** Emits right before dragging has started. */
  beforeStarted = new Subject<void>();

  /**
   * Emits when the user has moved a new drag item into this container.
   */
  entered = new Subject<{item: DragRef, container: DropListRef, currentIndex: number}>();

  /**
   * Emits when the user removes an item from the container
   * by dragging it into another container.
   */
  exited = new Subject<{item: DragRef, container: DropListRef}>();

  /** Emits when the user drops an item inside the container. */
  dropped = new Subject<{
    item: DragRef,
    currentIndex: number,
    previousIndex: number,
    container: DropListRef,
    previousContainer: DropListRef,
    isPointerOverContainer: boolean,
    distance: Point;
  }>();

  /** Emits as the user is swapping items while actively dragging. */
  sorted = new Subject<{
    previousIndex: number,
    currentIndex: number,
    container: DropListRef,
    item: DragRef
  }>();

  /** Arbitrary data that can be attached to the drop list. */
  data: T;

  /** Whether an item in the list is being dragged. */
  private _isDragging = false;

  /** Cache of the dimensions of all the items inside the container. */
  private _itemPositions: CachedItemPosition[] = [];

  /** Keeps track of the container's scroll position. */
  private _scrollPosition: ScrollPosition = {top: 0, left: 0};

  /** Keeps track of the scroll position of the viewport. */
  private _viewportScrollPosition: ScrollPosition = {top: 0, left: 0};

  /** Cached `ClientRect` of the drop list. */
  private _clientRect: ClientRect;

  /**
   * Draggable items that are currently active inside the container. Includes the items
   * from `_draggables`, as well as any items that have been dragged in, but haven't
   * been dropped yet.
   */
  private _activeDraggables: DragRef[];

  /**
   * Keeps track of the item that was last swapped with the dragged item, as
   * well as what direction the pointer was moving in when the swap occured.
   */
  private _previousSwap = {drag: null as DragRef | null, delta: 0};

  /** Draggable items in the container. */
  private _draggables: ReadonlyArray<DragRef>;

  /** Drop lists that are connected to the current one. */
  private _siblings: ReadonlyArray<DropListRef> = [];

  /** Direction in which the list is oriented. */
  private _orientation: 'horizontal' | 'vertical' = 'vertical';

  /** Connected siblings that currently have a dragged item. */
  private _activeSiblings = new Set<DropListRef>();

  /** Layout direction of the drop list. */
  private _direction: Direction = 'ltr';

  /** Subscription to the window being scrolled. */
  private _viewportScrollSubscription = Subscription.EMPTY;

  /** Vertical direction in which the list is currently scrolling. */
  private _verticalScrollDirection = AutoScrollVerticalDirection.NONE;

  /** Horizontal direction in which the list is currently scrolling. */
  private _horizontalScrollDirection = AutoScrollHorizontalDirection.NONE;

  /** Node that is being auto-scrolled. */
  private _scrollNode: HTMLElement | Window;

  /** Used to signal to the current auto-scroll sequence when to stop. */
  private _stopScrollTimers = new Subject<void>();

  /** Shadow root of the current element. Necessary for `elementFromPoint` to resolve correctly. */
  private _shadowRoot: DocumentOrShadowRoot;

  constructor(
    element: ElementRef<HTMLElement> | HTMLElement,
    private _dragDropRegistry: DragDropRegistry<DragRef, DropListRef>,
    _document: any,
    /**
     * @deprecated _ngZone and _viewportRuler parameters to be made required.
     * @breaking-change 9.0.0
     */
    private _ngZone?: NgZone,
    private _viewportRuler?: ViewportRuler) {
    const nativeNode = this.element = coerceElement(element);
    this._shadowRoot = getShadowRoot(nativeNode) || _document;
    _dragDropRegistry.registerDropContainer(this);
  }

  /** Removes the drop list functionality from the DOM element. */
  dispose() {
    this._stopScrolling();
    this._stopScrollTimers.complete();
    this._removeListeners();
    this.beforeStarted.complete();
    this.entered.complete();
    this.exited.complete();
    this.dropped.complete();
    this.sorted.complete();
    this._activeSiblings.clear();
    this._scrollNode = null!;
    this._dragDropRegistry.removeDropContainer(this);
  }

  /** Whether an item from this list is currently being dragged. */
  isDragging() {
    return this._isDragging;
  }

  /** Starts dragging an item. */
  start(): void {
    const element = coerceElement(this.element);
    this.beforeStarted.next();
    this._isDragging = true;
    this._cacheItems();
    this._siblings.forEach(sibling => sibling._startReceiving(this));
    this._removeListeners();

    // @breaking-change 9.0.0 Remove check for _ngZone once it's marked as a required param.
    if (this._ngZone) {
      this._ngZone.runOutsideAngular(() => element.addEventListener('scroll', this._handleScroll));
    } else {
      element.addEventListener('scroll', this._handleScroll);
    }

    // @breaking-change 9.0.0 Remove check for _viewportRuler once it's marked as a required param.
    if (this._viewportRuler) {
      this._listenToScrollEvents();
    }
  }

  /**
   * Emits an event to indicate that the user moved an item into the container.
   * @param item Item that was moved into the container.
   * @param pointerX Position of the item along the X axis.
   * @param pointerY Position of the item along the Y axis.
   */
  enter(item: DragRef, pointerX: number, pointerY: number): void {
    this.start();

    // If sorting is disabled, we want the item to return to its starting
    // position if the user is returning it to its initial container.
    let newIndex = this.sortingDisabled ? this._draggables.indexOf(item) : -1;

    if (newIndex === -1) {
      // We use the coordinates of where the item entered the drop
      // zone to figure out at which index it should be inserted.
      newIndex = this._getItemIndexFromPointerPosition(item, pointerX, pointerY);
    }

    const activeDraggables = this._activeDraggables;
    const currentIndex = activeDraggables.indexOf(item);
    const placeholder = item.getPlaceholderElement();
    let newPositionReference: DragRef | undefined = activeDraggables[newIndex];

    // If the item at the new position is the same as the item that is being dragged,
    // it means that we're trying to restore the item to its initial position. In this
    // case we should use the next item from the list as the reference.
    if (newPositionReference === item) {
      newPositionReference = activeDraggables[newIndex + 1];
    }

    // Since the item may be in the `activeDraggables` already (e.g. if the user dragged it
    // into another container and back again), we have to ensure that it isn't duplicated.
    if (currentIndex > -1) {
      activeDraggables.splice(currentIndex, 1);
    }

    // Don't use items that are being dragged as a reference, because
    // their element has been moved down to the bottom of the body.
    if (newPositionReference && !this._dragDropRegistry.isDragging(newPositionReference)) {
      const element = newPositionReference.getRootElement();
      element.parentElement!.insertBefore(placeholder, element);
      activeDraggables.splice(newIndex, 0, item);
    } else {
      coerceElement(this.element).appendChild(placeholder);
      activeDraggables.push(item);
    }

    // The transform needs to be cleared so it doesn't throw off the measurements.
    placeholder.style.transform = '';

    // Note that the positions were already cached when we called `start` above,
    // but we need to refresh them since the amount of items has changed.
    this._cacheItemPositions();
    this.entered.next({item, container: this, currentIndex: this.getItemIndex(item)});
  }

  /**
   * Removes an item from the container after it was dragged into another container by the user.
   * @param item Item that was dragged out.
   */
  exit(item: DragRef): void {
    this._reset();
    this.exited.next({item, container: this});
  }

  /**
   * Drops an item into this container.
   * @param item Item being dropped into the container.
   * @param currentIndex Index at which the item should be inserted.
   * @param previousContainer Container from which the item got dragged in.
   * @param isPointerOverContainer Whether the user's pointer was over the
   *    container when the item was dropped.
   * @param distance Distance the user has dragged since the start of the dragging sequence.
   * @breaking-change 9.0.0 `distance` parameter to become required.
   */
  drop(item: DragRef, currentIndex: number, previousContainer: DropListRef,
    isPointerOverContainer: boolean, distance: Point = {x: 0, y: 0}): void {
    this._reset();
    this.dropped.next({
      item,
      currentIndex,
      previousIndex: previousContainer.getItemIndex(item),
      container: this,
      previousContainer,
      isPointerOverContainer,
      distance
    });
  }

  /**
   * Sets the draggable items that are a part of this list.
   * @param items Items that are a part of this list.
   */
  withItems(items: DragRef[]): this {
    this._draggables = items;
    items.forEach(item => item._withDropContainer(this));

    if (this.isDragging()) {
      this._cacheItems();
    }

    return this;
  }

  /** Sets the layout direction of the drop list. */
  withDirection(direction: Direction): this {
    this._direction = direction;
    return this;
  }

  /**
   * Sets the containers that are connected to this one. When two or more containers are
   * connected, the user will be allowed to transfer items between them.
   * @param connectedTo Other containers that the current containers should be connected to.
   */
  connectedTo(connectedTo: DropListRef[]): this {
    this._siblings = connectedTo.slice();
    return this;
  }

  /**
   * Sets the orientation of the container.
   * @param orientation New orientation for the container.
   */
  withOrientation(orientation: 'vertical' | 'horizontal'): this {
    this._orientation = orientation;
    return this;
  }

  /**
   * Figures out the index of an item in the container.
   * @param item Item whose index should be determined.
   */
  getItemIndex(item: DragRef): number {
    if (!this._isDragging) {
      return this._draggables.indexOf(item);
    }

    // Items are sorted always by top/left in the cache, however they flow differently in RTL.
    // The rest of the logic still stands no matter what orientation we're in, however
    // we need to invert the array when determining the index.
    const items = this._orientation === 'horizontal' && this._direction === 'rtl' ?
        this._itemPositions.slice().reverse() : this._itemPositions;

    return findIndex(items, currentItem => currentItem.drag === item);
  }

  /**
   * Whether the list is able to receive the item that
   * is currently being dragged inside a connected drop list.
   */
  isReceiving(): boolean {
    return this._activeSiblings.size > 0;
  }

  /**
   * Sorts an item inside the container based on its position.
   * @param item Item to be sorted.
   * @param pointerX Position of the item along the X axis.
   * @param pointerY Position of the item along the Y axis.
   * @param pointerDelta Direction in which the pointer is moving along each axis.
   */
  _sortItem(item: DragRef, pointerX: number, pointerY: number,
            pointerDelta: {x: number, y: number}): void {
    // Don't sort the item if sorting is disabled or it's out of range.
    if (this.sortingDisabled || !this._isPointerNearDropContainer(pointerX, pointerY)) {
      return;
    }

    const siblings = this._itemPositions;
    const newIndex = this._getItemIndexFromPointerPosition(item, pointerX, pointerY, pointerDelta);

    if (newIndex === -1 && siblings.length > 0) {
      return;
    }

    const isHorizontal = this._orientation === 'horizontal';
    const currentIndex = findIndex(siblings, currentItem => currentItem.drag === item);
    const siblingAtNewPosition = siblings[newIndex];
    const currentPosition = siblings[currentIndex].clientRect;
    const newPosition = siblingAtNewPosition.clientRect;
    const delta = currentIndex > newIndex ? 1 : -1;

    this._previousSwap.drag = siblingAtNewPosition.drag;
    this._previousSwap.delta = isHorizontal ? pointerDelta.x : pointerDelta.y;

    // How many pixels the item's placeholder should be offset.
    const itemOffset = this._getItemOffsetPx(currentPosition, newPosition, delta);

    // How many pixels all the other items should be offset.
    const siblingOffset = this._getSiblingOffsetPx(currentIndex, siblings, delta);

    // Save the previous order of the items before moving the item to its new index.
    // We use this to check whether an item has been moved as a result of the sorting.
    const oldOrder = siblings.slice();

    // Shuffle the array in place.
    moveItemInArray(siblings, currentIndex, newIndex);

    this.sorted.next({
      previousIndex: currentIndex,
      currentIndex: newIndex,
      container: this,
      item
    });

    siblings.forEach((sibling, index) => {
      // Don't do anything if the position hasn't changed.
      if (oldOrder[index] === sibling) {
        return;
      }

      const isDraggedItem = sibling.drag === item;
      const offset = isDraggedItem ? itemOffset : siblingOffset;
      const elementToOffset = isDraggedItem ? item.getPlaceholderElement() :
                                              sibling.drag.getRootElement();

      // Update the offset to reflect the new position.
      sibling.offset += offset;

      // Since we're moving the items with a `transform`, we need to adjust their cached
      // client rects to reflect their new position, as well as swap their positions in the cache.
      // Note that we shouldn't use `getBoundingClientRect` here to update the cache, because the
      // elements may be mid-animation which will give us a wrong result.
      if (isHorizontal) {
        // Round the transforms since some browsers will
        // blur the elements, for sub-pixel transforms.
        elementToOffset.style.transform = `translate3d(${Math.round(sibling.offset)}px, 0, 0)`;
        adjustClientRect(sibling.clientRect, 0, offset);
      } else {
        elementToOffset.style.transform = `translate3d(0, ${Math.round(sibling.offset)}px, 0)`;
        adjustClientRect(sibling.clientRect, offset, 0);
      }
    });
  }

  /**
   * Checks whether the user's pointer is close to the edges of either the
   * viewport or the drop list and starts the auto-scroll sequence.
   * @param pointerX User's pointer position along the x axis.
   * @param pointerY User's pointer position along the y axis.
   */
  _startScrollingIfNecessary(pointerX: number, pointerY: number) {
    if (this.autoScrollDisabled) {
      return;
    }

    let scrollNode: HTMLElement | Window | undefined;
    let verticalScrollDirection = AutoScrollVerticalDirection.NONE;
    let horizontalScrollDirection = AutoScrollHorizontalDirection.NONE;

    // Check whether we should start scrolling the container.
    if (this._isPointerNearDropContainer(pointerX, pointerY)) {
      const element = coerceElement(this.element);

      [verticalScrollDirection, horizontalScrollDirection] =
          getElementScrollDirections(element, this._clientRect, pointerX, pointerY);

      if (verticalScrollDirection || horizontalScrollDirection) {
        scrollNode = element;
      }
    }

    // @breaking-change 9.0.0 Remove null check for _viewportRuler once it's a required parameter.
    // Otherwise check if we can start scrolling the viewport.
    if (this._viewportRuler && !verticalScrollDirection && !horizontalScrollDirection) {
      const {width, height} = this._viewportRuler.getViewportSize();
      const clientRect = {width, height, top: 0, right: width, bottom: height, left: 0};
      verticalScrollDirection = getVerticalScrollDirection(clientRect, pointerY);
      horizontalScrollDirection = getHorizontalScrollDirection(clientRect, pointerX);
      scrollNode = window;
    }

    if (scrollNode && (verticalScrollDirection !== this._verticalScrollDirection ||
        horizontalScrollDirection !== this._horizontalScrollDirection ||
        scrollNode !== this._scrollNode)) {
      this._verticalScrollDirection = verticalScrollDirection;
      this._horizontalScrollDirection = horizontalScrollDirection;
      this._scrollNode = scrollNode;

      if ((verticalScrollDirection || horizontalScrollDirection) && scrollNode) {
        // @breaking-change 9.0.0 Remove null check for `_ngZone` once it is made required.
        if (this._ngZone) {
          this._ngZone.runOutsideAngular(this._startScrollInterval);
        } else {
          this._startScrollInterval();
        }
      } else {
        this._stopScrolling();
      }
    }
  }

  /** Stops any currently-running auto-scroll sequences. */
  _stopScrolling() {
    this._stopScrollTimers.next();
  }

  /** Caches the position of the drop list. */
  private _cacheOwnPosition() {
    const element = coerceElement(this.element);
    this._clientRect = getMutableClientRect(element);
    this._scrollPosition = {top: element.scrollTop, left: element.scrollLeft};
  }

  /** Refreshes the position cache of the items and sibling containers. */
  private _cacheItemPositions() {
    const isHorizontal = this._orientation === 'horizontal';

    this._itemPositions = this._activeDraggables.map(drag => {
      const elementToMeasure = this._dragDropRegistry.isDragging(drag) ?
          // If the element is being dragged, we have to measure the
          // placeholder, because the element is hidden.
          drag.getPlaceholderElement() :
          drag.getRootElement();
      return {drag, offset: 0, clientRect: getMutableClientRect(elementToMeasure)};
    }).sort((a, b) => {
      return isHorizontal ? a.clientRect.left - b.clientRect.left :
                            a.clientRect.top - b.clientRect.top;
    });
  }

  /** Resets the container to its initial state. */
  private _reset() {
    this._isDragging = false;

    // TODO(crisbeto): may have to wait for the animations to finish.
    this._activeDraggables.forEach(item => item.getRootElement().style.transform = '');
    this._siblings.forEach(sibling => sibling._stopReceiving(this));
    this._activeDraggables = [];
    this._itemPositions = [];
    this._previousSwap.drag = null;
    this._previousSwap.delta = 0;
    this._stopScrolling();
    this._removeListeners();
  }

  /**
   * Gets the offset in pixels by which the items that aren't being dragged should be moved.
   * @param currentIndex Index of the item currently being dragged.
   * @param siblings All of the items in the list.
   * @param delta Direction in which the user is moving.
   */
  private _getSiblingOffsetPx(currentIndex: number,
                              siblings: CachedItemPosition[],
                              delta: 1 | -1) {

    const isHorizontal = this._orientation === 'horizontal';
    const currentPosition = siblings[currentIndex].clientRect;
    const immediateSibling = siblings[currentIndex + delta * -1];
    let siblingOffset = currentPosition[isHorizontal ? 'width' : 'height'] * delta;

    if (immediateSibling) {
      const start = isHorizontal ? 'left' : 'top';
      const end = isHorizontal ? 'right' : 'bottom';

      // Get the spacing between the start of the current item and the end of the one immediately
      // after it in the direction in which the user is dragging, or vice versa. We add it to the
      // offset in order to push the element to where it will be when it's inline and is influenced
      // by the `margin` of its siblings.
      if (delta === -1) {
        siblingOffset -= immediateSibling.clientRect[start] - currentPosition[end];
      } else {
        siblingOffset += currentPosition[start] - immediateSibling.clientRect[end];
      }
    }

    return siblingOffset;
  }

  /**
   * Checks whether the pointer coordinates are close to the drop container.
   * @param pointerX Coordinates along the X axis.
   * @param pointerY Coordinates along the Y axis.
   */
  private _isPointerNearDropContainer(pointerX: number, pointerY: number): boolean {
    const {top, right, bottom, left, width, height} = this._clientRect;
    const xThreshold = width * DROP_PROXIMITY_THRESHOLD;
    const yThreshold = height * DROP_PROXIMITY_THRESHOLD;

    return pointerY > top - yThreshold && pointerY < bottom + yThreshold &&
           pointerX > left - xThreshold && pointerX < right + xThreshold;
  }

  /**
   * Gets the offset in pixels by which the item that is being dragged should be moved.
   * @param currentPosition Current position of the item.
   * @param newPosition Position of the item where the current item should be moved.
   * @param delta Direction in which the user is moving.
   */
  private _getItemOffsetPx(currentPosition: ClientRect, newPosition: ClientRect, delta: 1 | -1) {
    const isHorizontal = this._orientation === 'horizontal';
    let itemOffset = isHorizontal ? newPosition.left - currentPosition.left :
                                    newPosition.top - currentPosition.top;

    // Account for differences in the item width/height.
    if (delta === -1) {
      itemOffset += isHorizontal ? newPosition.width - currentPosition.width :
                                   newPosition.height - currentPosition.height;
    }

    return itemOffset;
  }

  /**
   * Gets the index of an item in the drop container, based on the position of the user's pointer.
   * @param item Item that is being sorted.
   * @param pointerX Position of the user's pointer along the X axis.
   * @param pointerY Position of the user's pointer along the Y axis.
   * @param delta Direction in which the user is moving their pointer.
   */
  private _getItemIndexFromPointerPosition(item: DragRef, pointerX: number, pointerY: number,
                                           delta?: {x: number, y: number}) {
    const isHorizontal = this._orientation === 'horizontal';

    return findIndex(this._itemPositions, ({drag, clientRect}, _, array) => {
      if (drag === item) {
        // If there's only one item left in the container, it must be
        // the dragged item itself so we use it as a reference.
        return array.length < 2;
      }

      if (delta) {
        const direction = isHorizontal ? delta.x : delta.y;

        // If the user is still hovering over the same item as last time, and they didn't change
        // the direction in which they're dragging, we don't consider it a direction swap.
        if (drag === this._previousSwap.drag && direction === this._previousSwap.delta) {
          return false;
        }
      }

      return isHorizontal ?
          // Round these down since most browsers report client rects with
          // sub-pixel precision, whereas the pointer coordinates are rounded to pixels.
          pointerX >= Math.floor(clientRect.left) && pointerX <= Math.floor(clientRect.right) :
          pointerY >= Math.floor(clientRect.top) && pointerY <= Math.floor(clientRect.bottom);
    });
  }

  /** Caches the current items in the list and their positions. */
  private _cacheItems(): void {
    this._activeDraggables = this._draggables.slice();
    this._cacheItemPositions();
    this._cacheOwnPosition();
  }

  /**
   * Updates the internal state of the container after a scroll event has happened.
   * @param scrollPosition Object that is keeping track of the scroll position.
   * @param newTop New top scroll position.
   * @param newLeft New left scroll position.
   * @param extraClientRect Extra `ClientRect` object that should be updated, in addition to the
   *  ones of the drag items. Useful when the viewport has been scrolled and we also need to update
   *  the `ClientRect` of the list.
   */
  private _updateAfterScroll(scrollPosition: ScrollPosition, newTop: number, newLeft: number,
    extraClientRect?: ClientRect) {
    const topDifference = scrollPosition.top - newTop;
    const leftDifference = scrollPosition.left - newLeft;

    if (extraClientRect) {
      adjustClientRect(extraClientRect, topDifference, leftDifference);
    }

    // Since we know the amount that the user has scrolled we can shift all of the client rectangles
    // ourselves. This is cheaper than re-measuring everything and we can avoid inconsistent
    // behavior where we might be measuring the element before its position has changed.
    this._itemPositions.forEach(({clientRect}) => {
      adjustClientRect(clientRect, topDifference, leftDifference);
    });

    // We need two loops for this, because we want all of the cached
    // positions to be up-to-date before we re-sort the item.
    this._itemPositions.forEach(({drag}) => {
      if (this._dragDropRegistry.isDragging(drag)) {
        // We need to re-sort the item manually, because the pointer move
        // events won't be dispatched while the user is scrolling.
        drag._sortFromLastPointerPosition();
      }
    });

    scrollPosition.top = newTop;
    scrollPosition.left = newLeft;
  }

  /** Handles the container being scrolled. Has to be an arrow function to preserve the context. */
  private _handleScroll = () => {
    if (!this.isDragging()) {
      return;
    }

    const element = coerceElement(this.element);
    this._updateAfterScroll(this._scrollPosition, element.scrollTop, element.scrollLeft);
  }

  /** Removes the event listeners associated with this drop list. */
  private _removeListeners() {
    coerceElement(this.element).removeEventListener('scroll', this._handleScroll);
    this._viewportScrollSubscription.unsubscribe();
  }

  /** Starts the interval that'll auto-scroll the element. */
  private _startScrollInterval = () => {
    this._stopScrolling();

    interval(0, animationFrameScheduler)
      .pipe(takeUntil(this._stopScrollTimers))
      .subscribe(() => {
        const node = this._scrollNode;

        if (this._verticalScrollDirection === AutoScrollVerticalDirection.UP) {
          incrementVerticalScroll(node, -AUTO_SCROLL_STEP);
        } else if (this._verticalScrollDirection === AutoScrollVerticalDirection.DOWN) {
          incrementVerticalScroll(node, AUTO_SCROLL_STEP);
        }

        if (this._horizontalScrollDirection === AutoScrollHorizontalDirection.LEFT) {
          incrementHorizontalScroll(node, -AUTO_SCROLL_STEP);
        } else if (this._horizontalScrollDirection === AutoScrollHorizontalDirection.RIGHT) {
          incrementHorizontalScroll(node, AUTO_SCROLL_STEP);
        }
      });
  }

  /**
   * Checks whether the user's pointer is positioned over the container.
   * @param x Pointer position along the X axis.
   * @param y Pointer position along the Y axis.
   */
  _isOverContainer(x: number, y: number): boolean {
    return isInsideClientRect(this._clientRect, x, y);
  }

  /**
   * Figures out whether an item should be moved into a sibling
   * drop container, based on its current position.
   * @param item Drag item that is being moved.
   * @param x Position of the item along the X axis.
   * @param y Position of the item along the Y axis.
   */
  _getSiblingContainerFromPosition(item: DragRef, x: number, y: number): DropListRef | undefined {
    return this._siblings.find(sibling => sibling._canReceive(item, x, y));
  }

  /**
   * Checks whether the drop list can receive the passed-in item.
   * @param item Item that is being dragged into the list.
   * @param x Position of the item along the X axis.
   * @param y Position of the item along the Y axis.
   */
  _canReceive(item: DragRef, x: number, y: number): boolean {
    if (!this.enterPredicate(item, this) || !isInsideClientRect(this._clientRect, x, y)) {
      return false;
    }

    const elementFromPoint = this._shadowRoot.elementFromPoint(x, y) as HTMLElement | null;

    // If there's no element at the pointer position, then
    // the client rect is probably scrolled out of the view.
    if (!elementFromPoint) {
      return false;
    }

    const nativeElement = coerceElement(this.element);

    // The `ClientRect`, that we're using to find the container over which the user is
    // hovering, doesn't give us any information on whether the element has been scrolled
    // out of the view or whether it's overlapping with other containers. This means that
    // we could end up transferring the item into a container that's invisible or is positioned
    // below another one. We use the result from `elementFromPoint` to get the top-most element
    // at the pointer position and to find whether it's one of the intersecting drop containers.
    return elementFromPoint === nativeElement || nativeElement.contains(elementFromPoint);
  }

  /**
   * Called by one of the connected drop lists when a dragging sequence has started.
   * @param sibling Sibling in which dragging has started.
   */
  _startReceiving(sibling: DropListRef) {
    const activeSiblings = this._activeSiblings;

    if (!activeSiblings.has(sibling)) {
      activeSiblings.add(sibling);
      this._cacheOwnPosition();
      this._listenToScrollEvents();
    }
  }

  /**
   * Called by a connected drop list when dragging has stopped.
   * @param sibling Sibling whose dragging has stopped.
   */
  _stopReceiving(sibling: DropListRef) {
    this._activeSiblings.delete(sibling);
    this._viewportScrollSubscription.unsubscribe();
  }

  /**
   * Starts listening to scroll events on the viewport.
   * Used for updating the internal state of the list.
   */
  private _listenToScrollEvents() {
    this._viewportScrollPosition = this._viewportRuler!.getViewportScrollPosition();
    this._viewportScrollSubscription = this._dragDropRegistry.scroll.subscribe(() => {
      if (this.isDragging()) {
        const newPosition = this._viewportRuler!.getViewportScrollPosition();
        this._updateAfterScroll(this._viewportScrollPosition, newPosition.top, newPosition.left,
                                this._clientRect);
      } else if (this.isReceiving()) {
        this._cacheOwnPosition();
      }
    });
  }
}


/**
 * Updates the top/left positions of a `ClientRect`, as well as their bottom/right counterparts.
 * @param clientRect `ClientRect` that should be updated.
 * @param top Amount to add to the `top` position.
 * @param left Amount to add to the `left` position.
 */
function adjustClientRect(clientRect: ClientRect, top: number, left: number) {
  clientRect.top += top;
  clientRect.bottom = clientRect.top + clientRect.height;

  clientRect.left += left;
  clientRect.right = clientRect.left + clientRect.width;
}


/**
 * Finds the index of an item that matches a predicate function. Used as an equivalent
 * of `Array.prototype.findIndex` which isn't part of the standard Google typings.
 * @param array Array in which to look for matches.
 * @param predicate Function used to determine whether an item is a match.
 */
function findIndex<T>(array: T[],
                      predicate: (value: T, index: number, obj: T[]) => boolean): number {

  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i], i, array)) {
      return i;
    }
  }

  return -1;
}


/**
 * Checks whether some coordinates are within a `ClientRect`.
 * @param clientRect ClientRect that is being checked.
 * @param x Coordinates along the X axis.
 * @param y Coordinates along the Y axis.
 */
function isInsideClientRect(clientRect: ClientRect, x: number, y: number) {
  const {top, bottom, left, right} = clientRect;
  return y >= top && y <= bottom && x >= left && x <= right;
}


/** Gets a mutable version of an element's bounding `ClientRect`. */
function getMutableClientRect(element: Element): ClientRect {
  const clientRect = element.getBoundingClientRect();

  // We need to clone the `clientRect` here, because all the values on it are readonly
  // and we need to be able to update them. Also we can't use a spread here, because
  // the values on a `ClientRect` aren't own properties. See:
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect#Notes
  return {
    top: clientRect.top,
    right: clientRect.right,
    bottom: clientRect.bottom,
    left: clientRect.left,
    width: clientRect.width,
    height: clientRect.height
  };
}

/**
 * Increments the vertical scroll position of a node.
 * @param node Node whose scroll position should change.
 * @param amount Amount of pixels that the `node` should be scrolled.
 */
function incrementVerticalScroll(node: HTMLElement | Window, amount: number) {
  if (node === window) {
    (node as Window).scrollBy(0, amount);
  } else {
    // Ideally we could use `Element.scrollBy` here as well, but IE and Edge don't support it.
    (node as HTMLElement).scrollTop += amount;
  }
}

/**
 * Increments the horizontal scroll position of a node.
 * @param node Node whose scroll position should change.
 * @param amount Amount of pixels that the `node` should be scrolled.
 */
function incrementHorizontalScroll(node: HTMLElement | Window, amount: number) {
  if (node === window) {
    (node as Window).scrollBy(amount, 0);
  } else {
    // Ideally we could use `Element.scrollBy` here as well, but IE and Edge don't support it.
    (node as HTMLElement).scrollLeft += amount;
  }
}

/**
 * Gets whether the vertical auto-scroll direction of a node.
 * @param clientRect Dimensions of the node.
 * @param pointerY Position of the user's pointer along the y axis.
 */
function getVerticalScrollDirection(clientRect: ClientRect, pointerY: number) {
  const {top, bottom, height} = clientRect;
  const yThreshold = height * SCROLL_PROXIMITY_THRESHOLD;

  if (pointerY >= top - yThreshold && pointerY <= top + yThreshold) {
    return AutoScrollVerticalDirection.UP;
  } else if (pointerY >= bottom - yThreshold && pointerY <= bottom + yThreshold) {
    return AutoScrollVerticalDirection.DOWN;
  }

  return AutoScrollVerticalDirection.NONE;
}

/**
 * Gets whether the horizontal auto-scroll direction of a node.
 * @param clientRect Dimensions of the node.
 * @param pointerX Position of the user's pointer along the x axis.
 */
function getHorizontalScrollDirection(clientRect: ClientRect, pointerX: number) {
  const {left, right, width} = clientRect;
  const xThreshold = width * SCROLL_PROXIMITY_THRESHOLD;

  if (pointerX >= left - xThreshold && pointerX <= left + xThreshold) {
    return AutoScrollHorizontalDirection.LEFT;
  } else if (pointerX >= right - xThreshold && pointerX <= right + xThreshold) {
    return AutoScrollHorizontalDirection.RIGHT;
  }

  return AutoScrollHorizontalDirection.NONE;
}

/**
 * Gets the directions in which an element node should be scrolled,
 * assuming that the user's pointer is already within it scrollable region.
 * @param element Element for which we should calculate the scroll direction.
 * @param clientRect Bounding client rectangle of the element.
 * @param pointerX Position of the user's pointer along the x axis.
 * @param pointerY Position of the user's pointer along the y axis.
 */
function getElementScrollDirections(element: HTMLElement, clientRect: ClientRect, pointerX: number,
  pointerY: number): [AutoScrollVerticalDirection, AutoScrollHorizontalDirection] {
  const computedVertical = getVerticalScrollDirection(clientRect, pointerY);
  const computedHorizontal = getHorizontalScrollDirection(clientRect, pointerX);
  let verticalScrollDirection = AutoScrollVerticalDirection.NONE;
  let horizontalScrollDirection = AutoScrollHorizontalDirection.NONE;

  // Note that we here we do some extra checks for whether the element is actually scrollable in
  // a certain direction and we only assign the scroll direction if it is. We do this so that we
  // can allow other elements to be scrolled, if the current element can't be scrolled anymore.
  // This allows us to handle cases where the scroll regions of two scrollable elements overlap.
  if (computedVertical) {
    const scrollTop = element.scrollTop;

    if (computedVertical === AutoScrollVerticalDirection.UP) {
      if (scrollTop > 0) {
        verticalScrollDirection = AutoScrollVerticalDirection.UP;
      }
    } else if (element.scrollHeight - scrollTop > element.clientHeight) {
      verticalScrollDirection = AutoScrollVerticalDirection.DOWN;
    }
  }

  if (computedHorizontal) {
    const scrollLeft = element.scrollLeft;

    if (computedHorizontal === AutoScrollHorizontalDirection.LEFT) {
      if (scrollLeft > 0) {
        horizontalScrollDirection = AutoScrollHorizontalDirection.LEFT;
      }
    } else if (element.scrollWidth - scrollLeft > element.clientWidth) {
      horizontalScrollDirection = AutoScrollHorizontalDirection.RIGHT;
    }
  }

  return [verticalScrollDirection, horizontalScrollDirection];
}

/** Gets the shadow root of an element, if any. */
function getShadowRoot(element: HTMLElement): DocumentOrShadowRoot | null {
  if (_supportsShadowDom()) {
    const rootNode = element.getRootNode ? element.getRootNode() : null;

    if (rootNode instanceof ShadowRoot) {
      return rootNode;
    }
  }

  return null;
}

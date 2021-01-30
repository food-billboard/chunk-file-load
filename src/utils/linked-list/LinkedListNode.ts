/**
 * code from the 'https://github.com/trekhleb/javascript-algorithms' thanks
 */

export default class LinkedListNode<T> {

  constructor(value: LinkedListNode<T>, next: LinkedListNode<T>| null = null) {
    this.value = value;
    this.next = next
  }

  value: LinkedListNode<T>
  next: LinkedListNode<T> | null

  toString(callback: (value: LinkedListNode<T>) => string) {
    return callback ? callback(this.value) : `${this.value}`;
  }

}

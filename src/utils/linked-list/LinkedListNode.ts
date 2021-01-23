export default class LinkedListNode<T> {

  constructor(value: T, next: T | null | undefined = null) {
    this.value = value;
    this.next = next
  }

  value: T
  next: T | null

  toString(callback: (value: T) => string) {
    return callback ? callback(this.value) : `${this.value}`;
  }

}

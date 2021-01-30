/**
 * code from the 'https://github.com/trekhleb/javascript-algorithms' thanks
 */

import LinkedList from '../linked-list';
import LinkedListNode from '../linked-list/LinkedListNode'

export default class Queue<T=any> {

  constructor() {
    this.linkedList = new LinkedList()
  }

  private linkedList: LinkedList<T>

  public isEmpty(): boolean {
    return !this.linkedList.head;
  }

  public peek() {
    if (!this.linkedList.head) {
      return null;
    }

    return this.linkedList.head.value;
  }

  public enqueue(value: LinkedListNode<T>) {
    this.linkedList.append(value)
  }

  public dequeue() {
    const removedHead = this.linkedList.deleteHead();
    return removedHead ? removedHead.value : null;
  }

  public toString(callback: (value: LinkedListNode<T>) => string) {
    return this.linkedList.toString(callback);
  }
}

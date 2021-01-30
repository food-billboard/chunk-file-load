/**
 * code from the 'https://github.com/trekhleb/javascript-algorithms' thanks
 */

import Node from './LinkedListNode';
import Comparator from '../comparator'

export const LinkedListNode = Node

export default class LinkedList<T> {

  constructor(comparatorFunction?: <K=Node<T>>(a: K, b: K) => 0 | 1 | -1) {
    this.head = null

    this.tail = null

    this.compare = new Comparator(comparatorFunction)
  }

  tail: Node<T> | null
  head: Node<T> | null
  compare: Comparator<Node<T>>

  public prepend(value: Node<T>) {
    const newNode = new Node<T>(value, this.head)
    this.head = newNode

    if (!this.tail) {
      this.tail = newNode;
    }

    return this;
  }

  public append(value: Node<T>) {
    const newNode = new Node(value);

    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;

      return this;
    }

    this.tail!.next = newNode;
    this.tail = newNode;

    return this;
  }

  public delete(value: Node<T>) {
    if (!this.head) {
      return null;
    }

    let deletedNode: Node<T> | null = null;

    while (this.head && this.compare.equal(this.head.value, value)) {
      deletedNode = this.head;
      this.head = this.head.next;
    }

    let currentNode: Node<T> | null = this.head;

    if (currentNode !== null) {
      while (currentNode.next) {
        if (this.compare.equal(currentNode.next.value, value)) {
          deletedNode = currentNode.next;
          currentNode.next = currentNode.next.next;
        } else {
          currentNode = currentNode.next;
        }
      }
    }

    if (this.compare.equal(this.tail!.value, value)) {
      this.tail = currentNode;
    }

    return deletedNode;
  }

  public find({ value = undefined, callback = undefined }: { value?: Node<T>, callback?: (value: Node<T>) => boolean }) {
    if (!this.head) {
      return null;
    }

    let currentNode: Node<T> | null = this.head;

    while (currentNode) {
      if (callback && callback(currentNode.value)) {
        return currentNode;
      }

      if (value !== undefined && this.compare.equal(currentNode.value, value)) {
        return currentNode;
      }

      currentNode = currentNode.next;
    }

    return null;
  }

  public deleteTail() {
    const deletedTail = this.tail;

    if (this.head === this.tail) {
      this.head = null;
      this.tail = null;

      return deletedTail;
    }

    let currentNode = this.head;
    while (currentNode?.next) {
      if (!currentNode.next.next) {
        currentNode.next = null;
      } else {
        currentNode = currentNode.next;
      }
    }

    this.tail = currentNode;

    return deletedTail;
  }

  public deleteHead() {
    if (!this.head) {
      return null;
    }

    const deletedHead = this.head;

    if (this.head.next) {
      this.head = this.head.next;
    } else {
      this.head = null;
      this.tail = null;
    }

    return deletedHead;
  }

  public fromArray(values: Node<T>[]) {
    values.forEach((value) => this.append(value));

    return this;
  }

  public toArray() {
    const nodes = [];

    let currentNode = this.head;
    while (currentNode) {
      nodes.push(currentNode);
      currentNode = currentNode.next;
    }

    return nodes;
  }

  public toString(callback: (value: Node<T>) => string) {
    return this.toArray().map((node) => node.toString(callback)).toString();
  }

  public reverse() {
    let currNode = this.head;
    let prevNode = null;
    let nextNode = null;

    while (currNode) {
      // Store next node.
      nextNode = currNode.next;

      // Change next node of the current node so it would link to previous node.
      currNode.next = prevNode;

      // Move prevNode and currNode nodes one step forward.
      prevNode = currNode;
      currNode = nextNode;
    }

    // Reset head and tail.
    this.tail = this.head;
    this.head = prevNode;

    return this;
  }
}

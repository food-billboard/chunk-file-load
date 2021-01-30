/**
 * code from the 'https://github.com/trekhleb/javascript-algorithms' thanks
 */

export default class Comparator<T=number> {

  constructor(compareFunction?: <T>(a: T, b: T) => 0 | 1 | -1 ) {
    this.compare = compareFunction || Comparator.defaultCompareFunction
  }

  compare = Comparator.defaultCompareFunction

  public static defaultCompareFunction<T>(a: T, b: T) {
    if (a === b) {
      return 0;
    }

    return a < b ? -1 : 1;
  }

  public equal(a: T, b: T): boolean {
    return this.compare(a, b) === 0;
  }

  public lessThan(a: T, b: T): boolean {
    return this.compare(a, b) < 0;
  }

  public greaterThan(a: T, b: T): boolean {
    return this.compare(a, b) > 0;
  }

  public lessThanOrEqual(a: T, b: T): boolean {
    return this.lessThan(a, b) || this.equal(a, b);
  }

  public greaterThanOrEqual(a: T, b: T): boolean {
    return this.greaterThan(a, b) || this.equal(a, b);
  }

  public reverse() {
    const compareOriginal = this.compare;
    this.compare = <T>(a: T, b: T) => compareOriginal(b, a);
  }
}

/**
 * Indicates that there is no element available.
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 1.0.0
 */
export class NoSuchElementError extends Error {

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NoSuchElementError.prototype);
  }
}

import {VisibilityAware} from "./visibility/visibility.context";

/**
 * Contains information to display a map.
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 1.0.0
 */
export class MapModel implements VisibilityAware {

  constructor(
    readonly title: string,
    readonly latitude: number,
    readonly longitude: number,
    public visible: boolean = false
  ) {}
}

/**
 * Enumerator for all available block types.
 *
 * @author nmaerchy <nm@studer-raiann.ch>
 * @version 1.0.0
 */
export enum BlockType {
  FEEDBACK,
  EXTERNAL_STREAM,
  PICTURE_UPLOAD,
  PICTURE,
  RICHTEXT,
  VIDEO,
  MAP,
  COMMENT,
  HORIZONTAL_LINE,
  AUDIO,
  ILIAS_LINK
}

/**
 * Base class for all specific block types. Shares common attributes over all blocks.
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 1.1.0
 */
export class BlockModel implements VisibilityAware {

 constructor(
   readonly sequence: number,
   public visible: boolean = false,
   private readonly type: BlockType
 ) {}

 isRichtext(): boolean {return this.type === BlockType.RICHTEXT}

 isPicture(): boolean {return this.type === BlockType.PICTURE}

 isVideo(): boolean {return this.type === BlockType.VIDEO}
}

/**
 * Model class for a text block.
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 1.0.0
 */
export class TextBlockModel extends BlockModel {

  constructor(
    sequence: number,
    readonly content: string,
  ) {super(sequence, false, BlockType.RICHTEXT)}
}

/**
 * Model class for a picture block.
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 1.0.0
 */
export class PictureBlockModel extends BlockModel {

  constructor(
    sequence: number,
    readonly title: string,
    readonly description: string,
    readonly thumbnail: string,
    readonly url: string
  ) {super(sequence, false, BlockType.PICTURE)}
}

/**
 * Model class for a video block
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 1.0.0
 */
export class VideoBlockModel extends BlockModel {

  constructor(
    sequence: number,
    readonly url: string
  ) {super(sequence, false, BlockType.VIDEO)}
}

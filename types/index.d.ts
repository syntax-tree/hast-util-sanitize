import {Node} from 'unist'

declare namespace sanitize {
  /**
   * Sanitization configuration
   */
  interface Schema {
    attributes?: {
      [key: string]: Array<string | [string, ...any[]]>
    }
    required?: {[key: string]: {[key: string]: any}}
    tagNames?: string[]
    protocols?: {[key: string]: string[]}
    ancestors?: {[key: string]: string[]}
    clobber?: string[]
    clobberPrefix?: string
    strip?: string[]
    allowComments?: boolean
    allowDoctypes?: boolean
  }
}

/**
 * Hast utility to sanitize a tree
 *
 * @param tree Hast tree
 * @param schema Configuration object - defaults to Github style sanitation
 */
declare function sanitize(tree: Node, schema?: sanitize.Schema): Node

export = sanitize

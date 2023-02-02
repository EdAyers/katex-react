// @flow
import { LexerInterface } from "./Token";

/**
 * Lexing or parsing positional information for error reporting.
 * This object is immutable.
 */
export default class SourceLocation {
    constructor(
        readonly lexer: LexerInterface, // Lexer holding the input string.
        readonly start: number,         // Start offset, zero-based inclusive.
        readonly end: number           // End offset, zero-based exclusive.
    ) { }

    /**
     * Merges two `SourceLocation`s from location providers, given they are
     * provided in order of appearance.
     * - Returns the first one's location if only the first is provided.
     * - Returns a merged range of the first and the last if both are provided
     *   and their lexers match.
     * - Otherwise, returns null.
     */
    static range(
        first?: { loc?: SourceLocation },
        second?: { loc?: SourceLocation },
    ): undefined | SourceLocation {
        if (!second) {
            return first && first.loc;
        } else if (!first || !first.loc || !second.loc ||
            first.loc.lexer !== second.loc.lexer) {
            return undefined;
        } else {
            return new SourceLocation(
                first.loc.lexer, first.loc.start, second.loc.end);
        }
    }
}

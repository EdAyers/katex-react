// @flow
import { NON_ATOMS } from "./symbols";
import SourceLocation from "./SourceLocation";
import { AlignSpec } from "./environments/array";
import { Atom } from "./symbols";
import { Mode, StyleStr } from "./types";
import { Token } from "./Token";
import { Measurement } from "./units";

export type NodeType = keyof ParseNodeTypes;
// export type ParseNode<TYPE extends NodeType> = ParseNodeTypes[TYPE];

// ParseNode's corresponding to Symbol `Group`s in symbols.js.
export type SymbolParseNode = atom | accentToken | mathord | opToken | spacing | textord

export type op = op_with_symb | op_no_symb | op_text;
// Union of all possible `ParseNode<>` types.
export type AnyParseNode =
    | array | color | colorToken | keyVals | op | ordgroup | raw | size | styling
    | supsub | tag | text | url | verb | atom | mathord | spacing | textord
    | accentToken | opToken | accent | accentUnder | cr | delimsizing | enclose
    | environment | font | genfrac | horizBrace | href | htmlmathml | includegraphics
    | infix | kern | lap | leftright | leftrightRight | mathchoice | middle | mclass
    | operatorname | overline | phantom | hphantom | vphantom | raisebox | rule | sizing | smash | sqrt | underline | xArrow

export interface ParseNode {
    type: string,
    mode: Mode,
    loc?: SourceLocation,
}

type ParseNodeTypes = {
    "array": array, "color": color, "color-token": colorToken, "keyVals": keyVals, "op": op, "ordgroup": ordgroup, "raw": raw, "size": size, "styling": styling, "supsub": supsub,
    "tag": tag, "text": text, "url": url, "verb": verb, "atom": atom, "mathord": mathord, "spacing": spacing, "textord": textord, "accent-token": accentToken, "op-token": opToken,
    "accent": accent, "accentUnder": accentUnder, "cr": cr, "delimsizing": delimsizing, "enclose": enclose, "environment": environment, "font": font, "genfrac": genfrac, "horizBrace": horizBrace, "href": href,
    "htmlmathml": htmlmathml, "includegraphics": includegraphics, "infix": infix, "kern": kern, "lap": lap, "leftright": leftright,
    "leftright-right": leftrightRight, "mathchoice": mathchoice, "middle": middle,
    "mclass": mclass, "operatorname": operatorname, "overline": overline, "phantom": phantom, "hphantom": hphantom, "vphantom": vphantom, "raisebox": raisebox, "rule": rule, "sizing": sizing, "smash": smash,
    "sqrt": sqrt, "underline": underline, "xArrow": xArrow,
}

export interface array extends ParseNode {
    type: "array",
    hskipBeforeAndAfter?: boolean,
    addJot?: boolean,
    cols?: AlignSpec[],
    arraystretch: number,
    body: AnyParseNode[][], // List of rows in the (2D) array.
    rowGaps: (Measurement)[],
    hLinesBeforeRow: Array<boolean[]>,
}
export interface color extends ParseNode {
    type: "color",
    color: string,
    body: AnyParseNode[],
}
export interface colorToken extends ParseNode {
    type: "color-token",
    color: string,
}
export interface keyVals extends ParseNode {
    type: "keyVals",
    keyVals: string,
}
// To avoid requiring run-time type assertions, this more carefully captures
// the requirements on the fields per the op.js htmlBuilder logic:
// - `body` and `value` are NEVER set simultanouesly.
// - When `symbol` is true, `body` is set.
export interface op_base extends ParseNode {
    type: "op",
    limits: boolean,
    alwaysHandleSupSub?: boolean,
    suppressBaseShift?: boolean,
    symbol: boolean,
    name: undefined | string,
    body: undefined | AnyParseNode[]
}
export interface op_with_symb extends op_base {
    symbol: true,
    name: string,
    body: undefined
}
export interface op_no_symb extends op_base {
    symbol: false,
    name: undefined,
    // body:  AnyParseNode[],
}
export interface op_text extends op_base {
    symbol: false,
    name: string,
    body: undefined
}
export interface ordgroup extends ParseNode {
    type: "ordgroup",
    body: AnyParseNode[],
    semisimple?: boolean,
}
export interface raw extends ParseNode {
    type: "raw",
    string: string,
}
export interface size extends ParseNode {
    type: "size",
    value: Measurement,
    isBlank: boolean,
}
export interface styling extends ParseNode {
    type: "styling",
    style: StyleStr,
    body: AnyParseNode[],
}
export interface supsub extends ParseNode {
    type: "supsub",
    base: AnyParseNode,
    sup?: AnyParseNode,
    sub?: AnyParseNode,
}
export interface tag extends ParseNode {
    type: "tag",
    body: AnyParseNode[],
    tag: AnyParseNode[],
}
export interface text extends ParseNode {
    type: "text",
    body: AnyParseNode[],
    font?: string,
}
export interface url extends ParseNode {
    type: "url",
    url: string,
}
export interface verb extends ParseNode {
    type: "verb",
    body: string,
    star: boolean,
}
// From symbol groups, constructed in Parser.js via `symbols` lookup.
// (Some of these have "-token" suffix to distinguish them from existing
// `ParseNode` types.)
export interface atom extends ParseNode {
    type: "atom",
    family: Atom,
    text: string,
}
export interface mathord extends ParseNode {
    type: "mathord",
    text: string,
}
export interface spacing extends ParseNode {
    type: "spacing",
    text: string,
}
export interface textord extends ParseNode {
    type: "textord",
    text: string,
}
// These "-token" types don't have corresponding HTML/MathML builders.
export interface accentToken extends ParseNode {
    type: "accent-token",
    text: string,
}
export interface opToken extends ParseNode {
    type: "op-token",
    text: string,
}
// From functions.js and functions/*.js. See also "color", "op", "styling",
// and "text" above.
export interface accent extends ParseNode {
    type: "accent",
    label: string,
    isStretchy?: boolean,
    isShifty?: boolean,
    base: AnyParseNode,
}
export interface accentUnder extends ParseNode {
    type: "accentUnder",
    label: string,
    isStretchy?: boolean,
    isShifty?: boolean,
    base: AnyParseNode,
}
export interface cr extends ParseNode {
    type: "cr",
    newRow: boolean,
    newLine: boolean,
    size: Measurement,
}
export interface delimsizing extends ParseNode {
    type: "delimsizing",
    size: 1 | 2 | 3 | 4,
    mclass: "mopen" | "mclose" | "mrel" | "mord",
    delim: string,
}
export interface enclose extends ParseNode {
    type: "enclose",
    label: string,
    backgroundColor?: string,
    borderColor?: string,
    body: AnyParseNode,
}
export interface environment extends ParseNode {
    type: "environment",
    name: string,
    nameGroup: AnyParseNode,
}
export interface font extends ParseNode {
    type: "font",
    font: string,
    body: AnyParseNode,
}
export interface genfrac extends ParseNode {
    type: "genfrac",
    continued: boolean,
    numer: AnyParseNode,
    denom: AnyParseNode,
    hasBarLine: boolean,
    leftDelim: null | string,
    rightDelim: null | string,
    size: StyleStr | "auto",
    barSize: Measurement | null,
}
export interface horizBrace extends ParseNode {
    type: "horizBrace",
    label: string,
    isOver: boolean,
    base: AnyParseNode,
}
export interface href extends ParseNode {
    type: "href",
    href: string,
    body: AnyParseNode[],
}
export interface htmlmathml extends ParseNode {
    type: "htmlmathml",
    html: AnyParseNode[],
    mathml: AnyParseNode[],
}
export interface includegraphics extends ParseNode {
    type: "includegraphics",
    alt: string,
    width: Measurement,
    height: Measurement,
    totalheight: Measurement,
    src: string,
}
export interface infix extends ParseNode {
    type: "infix",
    replaceWith: string,
    size?: Measurement,
    token?: Token,
}
export interface kern extends ParseNode {
    type: "kern",
    dimension: Measurement,
}
export interface lap extends ParseNode {
    type: "lap",
    alignment: string,
    body: AnyParseNode,
}
export interface leftright extends ParseNode {
    type: "leftright",
    body: AnyParseNode[],
    left: string,
    right: string,
}
export interface leftrightRight extends ParseNode {
    type: "leftright-right",
    delim: string,
}
export interface mathchoice extends ParseNode {
    type: "mathchoice",
    display: AnyParseNode[],
    text: AnyParseNode[],
    script: AnyParseNode[],
    scriptscript: AnyParseNode[],
}
export interface middle extends ParseNode {
    type: "middle",
    delim: string,
}
export interface mclass extends ParseNode {
    type: "mclass",
    mclass: string,
    body: AnyParseNode[],
}
export interface operatorname extends ParseNode {
    type: "operatorname",
    body: AnyParseNode[],
}
export interface overline extends ParseNode {
    type: "overline",
    body: AnyParseNode,
}
export interface phantom extends ParseNode {
    type: "phantom",
    body: AnyParseNode[],
}
export interface hphantom extends ParseNode {
    type: "hphantom",
    body: AnyParseNode,
}
export interface vphantom extends ParseNode {
    type: "vphantom",
    body: AnyParseNode,
}
export interface raisebox extends ParseNode {
    type: "raisebox",
    dy: Measurement,
    body: AnyParseNode,
}
export interface rule extends ParseNode {
    type: "rule",
    shift: Measurement | null,
    width: Measurement,
    height: Measurement,
}
export interface sizing extends ParseNode {
    type: "sizing",
    size: number,
    body: AnyParseNode[],
}
export interface smash extends ParseNode {
    type: "smash",
    body: AnyParseNode,
    smashHeight: boolean,
    smashDepth: boolean,
}
export interface sqrt extends ParseNode {
    type: "sqrt",
    body: AnyParseNode,
    index: AnyParseNode | null,
}
export interface underline extends ParseNode {
    type: "underline",
    body: AnyParseNode,
}
export interface xArrow extends ParseNode {
    type: "xArrow",
    label: string,
    body: AnyParseNode,
    below: AnyParseNode | null,
}

/**
 * Asserts that the node is of the given type and returns it with stricter
 * typing. Throws if the node's type does not match.
 */
export function assertNodeType<NODETYPE extends NodeType>(
    node: AnyParseNode,
    type: NODETYPE,
): ParseNodeTypes[NODETYPE] {
    const typedNode = checkNodeType(node, type);
    if (!typedNode) {
        throw new Error(
            `Expected node of type ${type}, but got ` +
            (node ? `node of type ${node.type}` : String(node)));
    }
    // $FlowFixMe: Unsure why.
    return typedNode;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
export function checkNodeType<NODETYPE extends NodeType>(
    node: AnyParseNode | null,
    type: NODETYPE,
): ParseNodeTypes[NODETYPE] | undefined {
    if (node && node.type === type) {
        // The definition of ParseNode<TYPE> doesn't communicate to flow that
        // `type: TYPE` (as that's not explicitly mentioned anywhere), though that
        // happens to be true for all our value types.
        // $FlowFixMe
        return node;
    }
    return undefined;
}

/**
 * Asserts that the node is of the given type and returns it with stricter
 * typing. Throws if the node's type does not match.
 */
export function assertAtomFamily(
    node: null | AnyParseNode,
    family: Atom,
): atom {
    const typedNode = checkAtomFamily(node, family);
    if (!typedNode) {
        throw new Error(
            `Expected node of type "atom" and family "${family}", but got ` +
            (node ?
                (node.type === "atom" ?
                    `atom of family ${node.family}` :
                    `node of type ${node.type}`) :
                String(node)));
    }
    return typedNode;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
export function checkAtomFamily(
    node: null | AnyParseNode,
    family: Atom,
): atom | null {
    return node && node.type === "atom" && node.family === family ?
        node :
        null;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
export function assertSymbolNodeType(node: null | AnyParseNode): SymbolParseNode {
    const typedNode = checkSymbolNodeType(node);
    if (!typedNode) {
        throw new Error(
            `Expected node of symbol group type, but got ` +
            (node ? `node of type ${node.type}` : String(node)));
    }
    return typedNode;
}

/**
 * Returns the node more strictly typed iff it is of the given type. Otherwise,
 * returns null.
 */
export function checkSymbolNodeType(node: null | AnyParseNode): null | SymbolParseNode {
    if (node && (node.type === "atom" || NON_ATOMS.hasOwnProperty(node.type))) {
        // @ts-ignore
        return node;
    }
    return null;
}

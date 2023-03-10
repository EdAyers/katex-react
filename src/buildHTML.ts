// @flow
/**
 * This file does the main work of building a domTree structure from a parse
 * tree. The entry point is the `buildHTML` function, which takes a parse tree.
 * Then, the buildExpression, buildGroup, and various groupBuilders functions
 * are called, to produce a final HTML tree.
 */

import ParseError from "./ParseError";
import Style from "./Style";
import buildCommon from "./buildCommon";
import {Anchor, Span} from "./domTree";
import utils from "./utils";
import {checkNodeType} from "./parseNode";
import {spacings, tightSpacings} from "./spacingData";
import {_htmlGroupBuilders as groupBuilders} from "./defineFunction";
import {DocumentFragment} from "./tree";

import Options from "./Options";
import {AnyParseNode} from "./parseNode";
import {HtmlDomNode, DomSpan} from "./domTree";

const makeSpan = buildCommon.makeSpan;

// Binary atoms (first class `mbin`) change into ordinary atoms (`mord`)
// depending on their surroundings. See TeXbook pg. 442-446, Rules 5 and 6,
// and the text before Rule 19.
const binLeftCanceller = ["leftmost", "mbin", "mopen", "mrel", "mop", "mpunct"];
const binRightCanceller = ["rightmost", "mrel", "mclose", "mpunct"];

const styleMap = {
    "display": Style.DISPLAY,
    "text": Style.TEXT,
    "script": Style.SCRIPT,
    "scriptscript": Style.SCRIPTSCRIPT,
};

type Side = "left" | "right";

const DomEnum = {
    mord: "mord",
    mop: "mop",
    mbin: "mbin",
    mrel: "mrel",
    mopen: "mopen",
    mclose: "mclose",
    mpunct: "mpunct",
    minner: "minner",
};
type DomType = keyof typeof DomEnum;

/**
 * Take a list of nodes, build them in order, and return a list of the built
 * nodes. documentFragments are flattened into their contents, so the
 * returned list contains no fragments. `isRealGroup` is true if `expression`
 * is a real group (no atoms will be added on either side), as opposed to
 * a partial group (e.g. one created by \color). `surrounding` is an array
 * consisting type of nodes that will be added to the left and right.
 */
export const buildExpression = function(
    expression: AnyParseNode[],
    options: Options,
    isRealGroup: boolean,
    surrounding: [null | DomType, null | DomType] = [null, null],
): HtmlDomNode[] {
    // Parse expressions into `groups`.
    const groups: HtmlDomNode[] = [];
    for (let i = 0; i < expression.length; i++) {
        const output = buildGroup(expression[i], options);
        if (output instanceof DocumentFragment) {
            const children: HtmlDomNode[] = output.children;
            groups.push(...children);
        } else {
            groups.push(output);
        }
    }

    // If `expression` is a partial group, let the parent handle spacings
    // to avoid processing groups multiple times.
    if (!isRealGroup) {
        return groups;
    }

    let glueOptions = options;
    if (expression.length === 1) {
        const node = checkNodeType(expression[0], "sizing") ||
            checkNodeType(expression[0], "styling");
        if (!node) {
            // No match.
        } else if (node.type === "sizing") {
            glueOptions = options.havingSize(node.size);
        } else if (node.type === "styling") {
            glueOptions = options.havingStyle(styleMap[node.style]);
        }
    }

    // Dummy spans for determining spacings between surrounding atoms.
    // If `expression` has no atoms on the left or right, class "leftmost"
    // or "rightmost", respectively, is used to indicate it.
    const dummyPrev = makeSpan([surrounding[0] || "leftmost"], [], options);
    const dummyNext = makeSpan([surrounding[1] || "rightmost"], [], options);

    // TODO: These code assumes that a node's math class is the first element
    // of its `classes` array. A later cleanup should ensure this, for
    // instance by changing the signature of `makeSpan`.

    // Before determining what spaces to insert, perform bin cancellation.
    // Binary operators change to ordinary symbols in some contexts.
    traverseNonSpaceNodes(groups, (node, prev) => {
        const prevType = prev.classes[0];
        const type = node.classes[0];
        if (prevType === "mbin" && utils.contains(binRightCanceller, type)) {
            prev.classes[0] = "mord";
        } else if (type === "mbin" && utils.contains(binLeftCanceller, prevType)) {
            node.classes[0] = "mord";
        }
    }, {node: dummyPrev}, dummyNext);

    traverseNonSpaceNodes(groups, (node, prev) => {
        const prevType = getTypeOfDomTree(prev);
        const type = getTypeOfDomTree(node);

        // 'mtight' indicates that the node is script or scriptscript style.
        const space = prevType && type ? (node.hasClass("mtight")
            ? tightSpacings[prevType]![type]
            : spacings[prevType]![type]) : null;
        if (space) { // Insert glue (spacing) after the `prev`.
            return buildCommon.makeGlue(space, glueOptions);
        }
    }, {node: dummyPrev}, dummyNext);

    return groups;
};

// Depth-first traverse non-space `nodes`, calling `callback` with the current and
// previous node as arguments, optionally returning a node to insert after the
// previous node. `prev` is an object with the previous node and `insertAfter`
// function to insert after it. `next` is a node that will be added to the right.
// Used for bin cancellation and inserting spacings.
const traverseNonSpaceNodes = function(
    nodes: HtmlDomNode[],
    callback: (node:HtmlDomNode, prev:HtmlDomNode) => (void | HtmlDomNode),
    prev: {
        node: HtmlDomNode,
        insertAfter?: (hdn:HtmlDomNode) => void,
    },
    next?: HtmlDomNode,
) {
    if (next) { // temporarily append the right node, if exists
        nodes.push(next);
    }
    let i = 0;
    for (; i < nodes.length; i++) {
        const node = nodes[i];
        const partialGroup = checkPartialGroup(node);
        if (partialGroup) { // Recursive DFS
            traverseNonSpaceNodes(partialGroup.children, callback, prev);
            continue;
        }

        // Ignore explicit spaces (e.g., \;, \,) when determining what implicit
        // spacing should go between atoms of different classes
        if (node.classes[0] === "mspace") {
            continue;
        }

        const result = callback(node, prev.node);
        if (result) {
            if (prev.insertAfter) {
                prev.insertAfter(result);
            } else { // insert at front
                nodes.unshift(result);
                i++;
            }
        }

        prev.node = node;
        prev.insertAfter = (index => n => {
            nodes.splice(index + 1, 0, n);
            i++;
        })(i);
    }
    if (next) {
        nodes.pop();
    }
};

// Check if given node is a partial group, i.e., does not affect spacing around.
const checkPartialGroup = function(
    node: HtmlDomNode,
): null | DocumentFragment<HtmlDomNode> | Anchor {
    if (node instanceof DocumentFragment || node instanceof Anchor) {
        return node;
    }
    return null;
};

// Return the outermost node of a domTree.
const getOutermostNode = function(
    node: HtmlDomNode,
    side: Side,
): HtmlDomNode {
    const partialGroup = checkPartialGroup(node);
    if (partialGroup) {
        const children = partialGroup.children;
        if (children.length) {
            if (side === "right") {
                return getOutermostNode(children[children.length - 1], "right");
            } else if (side === "left") {
                return getOutermostNode(children[0], "left");
            }
        }
    }
    return node;
};

// Return math atom class (mclass) of a domTree.
// If `side` is given, it will get the type of the outermost node at given side.
export const getTypeOfDomTree = function(
    node?: HtmlDomNode,
    side?: Side,
): null | DomType {
    if (!node) {
        return null;
    }
    if (side) {
        node = getOutermostNode(node, side);
    }
    // This makes a lot of assumptions as to where the type of atom
    // appears.  We should do a better job of enforcing this.
    return DomEnum[node.classes[0]] || null;
};

export const makeNullDelimiter = function(
    options: Options,
    classes: string[],
): DomSpan {
    const moreClasses = ["nulldelimiter"].concat(options.baseSizingClasses());
    return makeSpan(classes.concat(moreClasses));
};

/**
 * buildGroup is the function that takes a group and calls the correct groupType
 * function for it. It also handles the interaction of size and style changes
 * between parents and children.
 */
export const buildGroup = function(
    group: null | AnyParseNode,
    options: Options,
    baseOptions?: Options,
): HtmlDomNode {
    if (!group) {
        return makeSpan();
    }

    if (groupBuilders[group.type]) {
        // Call the groupBuilders function
        // $FlowFixMe
        let groupNode: HtmlDomNode = groupBuilders[group.type](group, options);

        // If the size changed between the parent and the current group, account
        // for that size difference.
        if (baseOptions && options.size !== baseOptions.size) {
            groupNode = makeSpan(options.sizingClasses(baseOptions),
                [groupNode], options);

            const multiplier =
                options.sizeMultiplier / baseOptions.sizeMultiplier;

            groupNode.height *= multiplier;
            groupNode.depth *= multiplier;
        }

        return groupNode;
    } else {
        throw new ParseError(
            "Got group of unknown type: '" + group.type + "'");
    }
};

/**
 * Combine an array of HTML DOM nodes (e.g., the output of `buildExpression`)
 * into an unbreakable HTML node of class .base, with proper struts to
 * guarantee correct vertical extent.  `buildHTML` calls this repeatedly to
 * make up the entire expression as a sequence of unbreakable units.
 */
function buildHTMLUnbreakable(children, options) {
    // Compute height and depth of this chunk.
    const body = makeSpan(["base"], children, options);

    // Add strut, which ensures that the top of the HTML element falls at
    // the height of the expression, and the bottom of the HTML element
    // falls at the depth of the expression.
    // We used to have separate top and bottom struts, where the bottom strut
    // would like to use `vertical-align: top`, but in IE 9 this lowers the
    // baseline of the box to the bottom of this strut (instead of staying in
    // the normal place) so we use an absolute value for vertical-align instead.
    const strut = makeSpan(["strut"]);
    strut.style.height = (body.height + body.depth) + "em";
    strut.style.verticalAlign = -body.depth + "em";
    body.children.unshift(strut);

    return body;
}

/**
 * Take an entire parse tree, and build it into an appropriate set of HTML
 * nodes.
 */
export default function buildHTML(tree: AnyParseNode[], options: Options): DomSpan {
    // Strip off outer tag wrapper for processing below.
    let tag : null | AnyParseNode[] = null;
    if (tree.length === 1) {
        let item = tree[0];
        if (item.type === "tag") {
            tag = item.tag;
            tree = item.body;
        }
    }

    // Build the expression contained in the tree
    const expression = buildExpression(tree, options, true);

    const children : HtmlDomNode[] = [];

    // Create one base node for each chunk between potential line breaks.
    // The TeXBook [p.173] says "A formula will be broken only after a
    // relation symbol like $=$ or $<$ or $\rightarrow$, or after a binary
    // operation symbol like $+$ or $-$ or $\times$, where the relation or
    // binary operation is on the ``outer level'' of the formula (i.e., not
    // enclosed in {...} and not part of an \over construction)."

    let parts : HtmlDomNode[] = [];
    for (let i = 0; i < expression.length; i++) {
        parts.push(expression[i]);
        if (expression[i].hasClass("mbin") ||
            expression[i].hasClass("mrel") ||
            expression[i].hasClass("allowbreak")) {
            // Put any post-operator glue on same line as operator.
            // Watch for \nobreak along the way, and stop at \newline.
            let nobreak = false;
            while (i < expression.length - 1 &&
                   expression[i + 1].hasClass("mspace") &&
                   !expression[i + 1].hasClass("newline")) {
                i++;
                parts.push(expression[i]);
                if (expression[i].hasClass("nobreak")) {
                    nobreak = true;
                }
            }
            // Don't allow break if \nobreak among the post-operator glue.
            if (!nobreak) {
                children.push(buildHTMLUnbreakable(parts, options));
                parts = [];
            }
        } else if (expression[i].hasClass("newline")) {
            // Write the line except the newline
            parts.pop();
            if (parts.length > 0) {
                children.push(buildHTMLUnbreakable(parts, options));
                parts = [];
            }
            // Put the newline at the top level
            children.push(expression[i]);
        }
    }
    if (parts.length > 0) {
        children.push(buildHTMLUnbreakable(parts, options));
    }

    // Now, if there was a tag, build it too and append it as a final child.
    let tagChild : Span<HtmlDomNode> | null = null;
    if (tag) {
        tagChild = buildHTMLUnbreakable(
            buildExpression(tag, options, true)
            , options
        );
        tagChild.classes = ["tag"];
        children.push(tagChild);
    }

    const htmlNode = makeSpan(["katex-html"], children);
    htmlNode.setAttribute("aria-hidden", "true");

    // Adjust the strut of the tag to be the maximum height of all children
    // (the height of the enclosing htmlNode) for proper vertical alignment.
    if (tagChild) {
        const strut = tagChild.children[0];
        strut.style.height = (htmlNode.height + htmlNode.depth) + "em";
        strut.style.verticalAlign = (-htmlNode.depth) + "em";
    }

    return htmlNode;
}

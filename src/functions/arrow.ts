// @flow
import defineFunction from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";
import stretchy from "../stretchy";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

import{ParseNode, xArrow} from "../parseNode";

// Stretchy arrows with an optional argument
defineFunction({
    type: "xArrow",
    names: [
        "\\xleftarrow", "\\xrightarrow", "\\xLeftarrow", "\\xRightarrow",
        "\\xleftrightarrow", "\\xLeftrightarrow", "\\xhookleftarrow",
        "\\xhookrightarrow", "\\xmapsto", "\\xrightharpoondown",
        "\\xrightharpoonup", "\\xleftharpoondown", "\\xleftharpoonup",
        "\\xrightleftharpoons", "\\xleftrightharpoons", "\\xlongequal",
        "\\xtwoheadrightarrow", "\\xtwoheadleftarrow", "\\xtofrom",
        // The next 3 functions are here to support the mhchem extension.
        // Direct use of these functions is discouraged and may break someday.
        "\\xrightleftarrows", "\\xrightequilibrium", "\\xleftequilibrium",
    ],
    props: {
        numArgs: 1,
        numOptionalArgs: 1,
    },
    handler({parser, funcName}, args, optArgs) {
        return {
            type: "xArrow",
            mode: parser.mode,
            label: funcName,
            body: args[0],
            below: optArgs[0],
        };
    },
    // Flow is unable to correctly infer the type of `group`, even though it's
    // unamibiguously determined from the passed-in `type` above.
    htmlBuilder(group: xArrow, options) {
        const style = options.style;

        // Build the argument groups in the appropriate style.
        // Ref: amsmath.dtx:   \hbox{$\scriptstyle\mkern#3mu{#6}\mkern#4mu$}%

        // Some groups can return document fragments.  Handle those by wrapping
        // them in a span.
        let newOptions = options.havingStyle(style.sup());
        const upperGroup = buildCommon.wrapFragment(
            html.buildGroup(group.body, newOptions, options), options);
        upperGroup.classes.push("x-arrow-pad");

        let lowerGroup;
        if (group.below) {
            // Build the lower group
            newOptions = options.havingStyle(style.sub());
            lowerGroup = buildCommon.wrapFragment(
                html.buildGroup(group.below, newOptions, options), options);
            lowerGroup.classes.push("x-arrow-pad");
        }

        const arrowBody = stretchy.svgSpan(group, options);

        // Re shift: Note that stretchy.svgSpan returned arrowBody.depth = 0.
        // The point we want on the math axis is at 0.5 * arrowBody.height.
        const arrowShift = -options.fontMetrics().axisHeight +
            0.5 * arrowBody.height;
        // 2 mu kern. Ref: amsmath.dtx: #7\if0#2\else\mkern#2mu\fi
        let upperShift = -options.fontMetrics().axisHeight
            - 0.5 * arrowBody.height - 0.111; // 0.111 em = 2 mu
        if (upperGroup.depth > 0.25 || group.label === "\\xleftequilibrium") {
            upperShift -= upperGroup.depth;  // shift up if depth encroaches
        }

        // Generate the vlist
        let vlist;
        if (lowerGroup) {
            const lowerShift = -options.fontMetrics().axisHeight
                + lowerGroup.height + 0.5 * arrowBody.height
                + 0.111;
            vlist = buildCommon.makeVList({
                positionType: "individualShift",
                children: [
                    {type: "elem", elem: upperGroup, shift: upperShift},
                    {type: "elem", elem: arrowBody,  shift: arrowShift},
                    {type: "elem", elem: lowerGroup, shift: lowerShift},
                ],
            }, options);
        } else {
            vlist = buildCommon.makeVList({
                positionType: "individualShift",
                children: [
                    {type: "elem", elem: upperGroup, shift: upperShift},
                    {type: "elem", elem: arrowBody,  shift: arrowShift},
                ],
            }, options);
        }

        // $FlowFixMe: Replace this with passing "svg-align" into makeVList.
        vlist.children[0].children[0].children[1].classes.push("svg-align");

        return buildCommon.makeSpan(["mrel", "x-arrow"], [vlist], options);
    },
    mathmlBuilder(group, options) {
        const arrowNode = stretchy.mathMLnode(group.label);
        let node;
        let lowerNode;

        if (group.body) {
            const upperNode = mml.buildGroup(group.body, options);
            if (group.below) {
                lowerNode = mml.buildGroup(group.below, options);
                node = new mathMLTree.MathNode(
                    "munderover", [arrowNode, lowerNode, upperNode]
                );
            } else {
                node = new mathMLTree.MathNode("mover", [arrowNode, upperNode]);
            }
        } else if (group.below) {
            lowerNode = mml.buildGroup(group.below, options);
            node = new mathMLTree.MathNode("munder", [arrowNode, lowerNode]);
        } else {
            node = new mathMLTree.MathNode("mover", [arrowNode]);
        }
        return node;
    },
});

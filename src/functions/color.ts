// @flow
import defineFunction, {ordargument, HtmlBuilder} from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";
import {assertNodeType, color} from "../parseNode";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

const htmlBuilder : HtmlBuilder<color> = (group, options) => {
    const elements = html.buildExpression(
        group.body,
        options.withColor(group.color),
        false
    );

    // \color isn't supposed to affect the type of the elements it contains.
    // To accomplish this, we wrap the results in a fragment, so the inner
    // elements will be able to directly interact with their neighbors. For
    // example, `\color{red}{2 +} 3` has the same spacing as `2 + 3`
    return buildCommon.makeFragment(elements);
};

const mathmlBuilder = (group, options) => {
    const inner = mml.buildExpression(group.body, options);

    const node = new mathMLTree.MathNode("mstyle", inner);

    node.setAttribute("mathcolor", group.color);

    return node;
};

defineFunction<color>({
    type: "color",
    names: ["\\textcolor"],
    props: {
        numArgs: 2,
        allowedInText: true,
        greediness: 3,
        argTypes: ["color", "original"],
    },
    handler({parser}, args) {
        const color = assertNodeType(args[0], "color-token").color;
        const body = args[1];
        return {
            type: "color",
            mode: parser.mode,
            color,
            body: ordargument(body),
        };
    },
    htmlBuilder,
    mathmlBuilder,
});

// TODO(kevinb): define these using macros
defineFunction({
    type: "color",
    names: [
        "\\blue", "\\orange", "\\pink", "\\red",
        "\\green", "\\gray", "\\purple",
        "\\blueA", "\\blueB", "\\blueC", "\\blueD", "\\blueE",
        "\\tealA", "\\tealB", "\\tealC", "\\tealD", "\\tealE",
        "\\greenA", "\\greenB", "\\greenC", "\\greenD", "\\greenE",
        "\\goldA", "\\goldB", "\\goldC", "\\goldD", "\\goldE",
        "\\redA", "\\redB", "\\redC", "\\redD", "\\redE",
        "\\maroonA", "\\maroonB", "\\maroonC", "\\maroonD", "\\maroonE",
        "\\purpleA", "\\purpleB", "\\purpleC", "\\purpleD", "\\purpleE",
        "\\mintA", "\\mintB", "\\mintC",
        "\\grayA", "\\grayB", "\\grayC", "\\grayD", "\\grayE",
        "\\grayF", "\\grayG", "\\grayH", "\\grayI",
        "\\kaBlue", "\\kaGreen",
    ],
    props: {
        numArgs: 1,
        allowedInText: true,
        greediness: 3,
    },
    handler({parser, funcName}, args) {
        const body = args[0];
        return {
            type: "color",
            mode: parser.mode,
            color: "katex-" + funcName.slice(1),
            body: ordargument(body),
        };
    },
    htmlBuilder,
    mathmlBuilder,
});

defineFunction({
    type: "color",
    names: ["\\color"],
    props: {
        numArgs: 1,
        allowedInText: true,
        greediness: 3,
        argTypes: ["color"],
    },
    handler({parser, breakOnTokenText}, args) {
        const color = assertNodeType(args[0], "color-token").color;

        // If we see a styling function, parse out the implicit body
        const body = parser.parseExpression(true, breakOnTokenText);

        return {
            type: "color",
            mode: parser.mode,
            color,
            body,
        };
    },
    htmlBuilder,
    mathmlBuilder,
});

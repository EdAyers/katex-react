// @flow
import defineFunction, {ordargument} from "../defineFunction";
import buildCommon from "../buildCommon";
import {assertNodeType, href, text, textord, AnyParseNode} from "../parseNode";
import {MathNode} from "../mathMLTree";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

defineFunction<href>({
    type: "href",
    names: ["\\href"],
    props: {
        numArgs: 2,
        argTypes: ["url", "original"],
        allowedInText: true,
    },
    handler: ({parser}, args) => {
        const body = args[1];
        const href = assertNodeType(args[0], "url").url;
        return {
            type: "href",
            mode: parser.mode,
            href,
            body: ordargument(body),
        };
    },
    htmlBuilder: (group, options) => {
        const elements = html.buildExpression(group.body, options, false);
        return buildCommon.makeAnchor(group.href, [], elements, options);
    },
    mathmlBuilder: (group, options) => {
        let math = mml.buildExpressionRow(group.body, options);
        let mnode : MathNode = math instanceof MathNode ? math : new MathNode("mrow", [math]);
        mnode.setAttribute("href", group.href);
        return math;
    },
});

defineFunction({
    type: "href",
    names: ["\\url"],
    props: {
        numArgs: 1,
        argTypes: ["url"],
        allowedInText: true,
    },
    handler: ({parser}, args) => {
        const href = assertNodeType(args[0], "url").url;
        const chars : AnyParseNode[] = [];
        for (let i = 0; i < href.length; i++) {
            let c = href[i];
            if (c === "~") {
                c = "\\textasciitilde";
            }
            chars.push({
                type: "textord",
                mode: "text",
                text: c,
            } as textord);
        }
        const body : text = {
            type: "text",
            mode: parser.mode,
            font: "\\texttt",
            body: chars,
        };
        return {
            type: "href" as "href",
            mode: parser.mode,
            href,
            body: ordargument(body),
        };
    },
});

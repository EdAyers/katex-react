// @flow
import {defineFunctionBuilders} from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";

import * as mml from "../buildMathML";

import{ParseNode, mathord, textord} from "../parseNode";

// "mathord" and "textord" ParseNodes created in Parser.js from symbol Groups in
// src/symbols.js.

const defaultVariant: {[k:string]: string} = {
    "mi": "italic",
    "mn": "normal",
    "mtext": "normal",
};

defineFunctionBuilders<mathord>({
    type: "mathord",
    htmlBuilder(group, options) {
        return buildCommon.makeOrd(group, options, "mathord");
    },
    mathmlBuilder(group: mathord, options) {
        const node = new mathMLTree.MathNode(
            "mi",
            [mml.makeText(group.text, group.mode, options)]);

        const variant = mml.getVariant(group, options) || "italic";
        if (variant !== defaultVariant[node.type]) {
            node.setAttribute("mathvariant", variant);
        }
        return node;
    },
});

defineFunctionBuilders<textord>({
    type: "textord",
    htmlBuilder(group, options) {
        return buildCommon.makeOrd(group, options, "textord");
    },
    mathmlBuilder(group, options) {
        const text = mml.makeText(group.text, group.mode, options);
        const variant = mml.getVariant(group, options) || "normal";

        let node;
        if (group.mode === 'text') {
            node = new mathMLTree.MathNode("mtext", [text]);
        } else if (/[0-9]/.test(group.text)) {
            // TODO(kevinb) merge adjacent <mn> nodes
            // do it as a post processing step
            node = new mathMLTree.MathNode("mn", [text]);
        } else if (group.text === "\\prime") {
            node = new mathMLTree.MathNode("mo", [text]);
        } else {
            node = new mathMLTree.MathNode("mi", [text]);
        }
        if (variant !== defaultVariant[node.type]) {
            node.setAttribute("mathvariant", variant);
        }

        return node;
    },
});

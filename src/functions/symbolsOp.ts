// @flow
import {defineFunctionBuilders} from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";

import * as mml from "../buildMathML";
import { atom } from "../parseNode";

// Operator ParseNodes created in Parser.js from symbol Groups in src/symbols.js.

defineFunctionBuilders<atom>({
    type: "atom",
    htmlBuilder(group, options) {
        return buildCommon.mathsym(
            group.text, group.mode, options, ["m" + group.family]);
    },
    mathmlBuilder(group, options) {
        const node = new mathMLTree.MathNode(
            "mo", [mml.makeText(group.text, group.mode)]);
        if (group.family === "bin") {
            const variant = mml.getVariant(group, options);
            if (variant === "bold-italic") {
                node.setAttribute("mathvariant", variant);
            }
        } else if (group.family === "punct") {
            node.setAttribute("separator", "true");
        }
        return node;
    },
});


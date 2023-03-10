// @flow
/**
 * These objects store the data about the DOM nodes we create, as well as some
 * extra data. They can then be transformed into real DOM nodes with the
 * `toNode` function or HTML markup using `toMarkup`. They are useful for both
 * storing extra properties on the nodes, as well as providing a way to easily
 * work with the DOM.
 *
 * Similar functions for working with MathML nodes exist in mathMLTree.js.
 *
 * TODO: refactor `span` and `anchor` into common superclass when
 * target environments support class inheritance
 */
import { scriptFromCodepoint } from "./unicodeScripts";
import utils from "./utils";
import svgGeometry from "./svgGeometry";
import Options from "./Options";
import { DocumentFragment } from "./tree";

import { VirtualNode } from "./tree";

import * as React from 'react';
/**
 * Create an HTML className based on a list of classes. In addition to joining
 * with spaces, we also remove empty classes.
 */
export const createClass = function (classes: string[]): string {
    return classes.filter(cls => cls).join(" ");
};

const initNode = function (
    classes?: string[],
    options?: Options,
    style?: React.CSSProperties,
) {
    this.classes = classes || [];
    this.attributes = {};
    this.height = 0;
    this.depth = 0;
    this.maxFontSize = 0;
    this.style = style || {};
    if (options) {
        if (options.style.isTight()) {
            this.classes.push("mtight");
        }
        const color = options.getColor();
        if (color) {
            this.style.color = color;
        }
    }
};

const toReact = function (tagName: string, key?) {
    let Tag = tagName;
    return React.createElement(tagName,{
        style: {...this.style} || {},
        className: createClass(this.classes || []),
        key,
        ...this.attributes,
        children: this.children.map((x,i) => x.toReact(i))
    });
}

/**
 * Convert into an HTML node
 */
const toNode = function (tagName: string): HTMLElement {
    const node = document.createElement(tagName);

    // Apply the class
    node.className = createClass(this.classes);

    // Apply inline styles
    for (const style in this.style) {
        if (this.style.hasOwnProperty(style)) {
            // $FlowFixMe Flow doesn't seem to understand span.style's type.
            node.style[style] = this.style[style];
        }
    }

    // Apply attributes
    for (const attr in this.attributes) {
        if (this.attributes.hasOwnProperty(attr)) {
            node.setAttribute(attr, this.attributes[attr]);
        }
    }

    // Append the children, also as HTML nodes
    for (let i = 0; i < this.children.length; i++) {
        node.appendChild(this.children[i].toNode());
    }

    return node;
};

/**
 * Convert into an HTML markup string
 */
const toMarkup = function (tagName: string): string {
    let markup = `<${tagName}`;

    // Add the class
    if (this.classes.length) {
        markup += ` class="${utils.escape(createClass(this.classes))}"`;
    }

    let styles = "";

    // Add the styles, after hyphenation
    for (const style in this.style) {
        if (this.style.hasOwnProperty(style)) {
            styles += `${utils.hyphenate(style)}:${this.style[style]};`;
        }
    }

    if (styles) {
        markup += ` style="${utils.escape(styles)}"`;
    }

    // Add the attributes
    for (const attr in this.attributes) {
        if (this.attributes.hasOwnProperty(attr)) {
            markup += ` ${attr}="${utils.escape(this.attributes[attr])}"`;
        }
    }

    markup += ">";

    // Add the markup of the children, also as markup
    for (let i = 0; i < this.children.length; i++) {
        markup += this.children[i].toMarkup();
    }

    markup += `</${tagName}>`;

    return markup;
};

export interface HtmlDomNode extends VirtualNode {
    classes: string[];
    height: number;
    depth: number;
    maxFontSize: number;
    style: React.CSSProperties;
    hasClass(className: string): boolean;
    toReact(key?:number|string);
}

// Span wrapping other DOM nodes.
export type DomSpan = Span<HtmlDomNode>;
// Span wrapping an SVG node.
export type SvgSpan = Span<SvgNode>;

export type SvgChildNode = PathNode | LineNode;
export type documentFragment = DocumentFragment<HtmlDomNode>;


/**
 * This node represents a span node, with a className, a list of children, and
 * an inline style. It also contains information about its height, depth, and
 * maxFontSize.
 *
 * Represents two types with different uses: SvgSpan to wrap an SVG and DomSpan
 * otherwise. This typesafety is important when HTML builders access a span's
 * children.
 */
export class Span<ChildType extends VirtualNode> implements HtmlDomNode {
    children: ChildType[];
    attributes: { [k: string]: string };
    classes: string[];
    height: number;
    depth: number;
    width?: number;
    maxFontSize: number;
    style: React.CSSProperties;

    constructor(
        classes?: string[],
        children?: ChildType[],
        options?: Options,
        style?: React.CSSProperties,
    ) {
        initNode.call(this, classes, options, style);
        this.children = children || [];
    }

    /**
     * Sets an arbitrary attribute on the span. Warning: use this wisely. Not
     * all browsers support attributes the same, and having too many custom
     * attributes is probably bad.
     */
    setAttribute(attribute: string, value: string) {
        this.attributes[attribute] = value;
    }

    hasClass(className: string): boolean {
        return utils.contains(this.classes, className);
    }

    toNode(): HTMLElement {
        return toNode.call(this, "span");
    }

    toMarkup(): string {
        return toMarkup.call(this, "span");
    }

    toReact(k?) {return toReact.call(this, "span", k);}
}

/**
 * This node represents an anchor (<a>) element with a hyperlink.  See `span`
 * for further details.
 */
export class Anchor implements HtmlDomNode {
    children: HtmlDomNode[];
    attributes: { [k: string]: string };
    classes: string[];
    height: number;
    depth: number;
    maxFontSize: number;
    style: React.CSSProperties;

    constructor(
        href: string,
        classes: string[],
        children: HtmlDomNode[],
        options: Options,
    ) {
        initNode.call(this, classes, options);
        this.children = children || [];
        this.setAttribute('href', href);
    }

    setAttribute(attribute: string, value: string) {
        this.attributes[attribute] = value;
    }

    hasClass(className: string): boolean {
        return utils.contains(this.classes, className);
    }

    toNode(): HTMLElement {
        return toNode.call(this, "a");
    }

    toMarkup(): string {
        return toMarkup.call(this, "a");
    }
    toReact(k?) {return toReact.call(this, "a", k);}
}

/**
 * This node represents an image embed (<img>) element.
 */
export class Img implements VirtualNode {
    src: string;
    alt: string;
    classes: string[];
    height: number;
    depth: number;
    maxFontSize: number;
    style: React.CSSProperties;

    constructor(
        src: string,
        alt: string,
        style: React.CSSProperties,
    ) {
        this.alt = alt;
        this.src = src;
        this.classes = ["mord"];
        this.style = style;
    }

    hasClass(className: string): boolean {
        return utils.contains(this.classes, className);
    }

    toNode(): Node {
        const node = document.createElement("img");
        node.src = this.src;
        node.alt = this.alt;
        node.className = "mord";

        // Apply inline styles
        for (const style in this.style) {
            if (this.style.hasOwnProperty(style)) {
                // $FlowFixMe
                node.style[style] = this.style[style];
            }
        }

        return node;
    }

    toMarkup(): string {
        let markup = `<img  src='${this.src} 'alt='${this.alt}' `;

        // Add the styles, after hyphenation
        let styles = "";
        for (const style in this.style) {
            if (this.style.hasOwnProperty(style)) {
                styles += `${utils.hyphenate(style)}:${this.style[style]};`;
            }
        }
        if (styles) {
            markup += ` style="${utils.escape(styles)}"`;
        }

        markup += "'/>";
        return markup;
    }

    toReact(k?) {
        return <img src={this.src} alt={this.alt} style={this.style} key={k}/>;
    }
}

const iCombinations = {
    '??': '\u0131\u0302',
    '??': '\u0131\u0308',
    '??': '\u0131\u0301',
    // '??': '\u0131\u0304', // enable when we add Extended Latin
    '??': '\u0131\u0300',
};

/**
 * A symbol node contains information about a single symbol. It either renders
 * to a single text node, or a span with a single text node in it, depending on
 * whether it has CSS classes, styles, or needs italic correction.
 */
export class SymbolNode implements HtmlDomNode {
    text: string;
    height: number;
    depth: number;
    italic: number;
    skew: number;
    width: number;
    maxFontSize: number;
    classes: string[];
    style: React.CSSProperties;

    constructor(
        text: string,
        height?: number,
        depth?: number,
        italic?: number,
        skew?: number,
        width?: number,
        classes?: string[],
        style?: React.CSSProperties,
    ) {
        this.text = text;
        this.height = height || 0;
        this.depth = depth || 0;
        this.italic = italic || 0;
        this.skew = skew || 0;
        this.width = width || 0;
        this.classes = classes || [];
        this.style = style || {};
        this.maxFontSize = 0;

        // Mark text from non-Latin scripts with specific classes so that we
        // can specify which fonts to use.  This allows us to render these
        // characters with a serif font in situations where the browser would
        // either default to a sans serif or render a placeholder character.
        // We use CSS class names like cjk_fallback, hangul_fallback and
        // brahmic_fallback. See ./unicodeScripts.js for the set of possible
        // script names
        const script = scriptFromCodepoint(this.text.charCodeAt(0));
        if (script) {
            this.classes.push(script + "_fallback");
        }

        if (/[????????]/.test(this.text)) {    // add ?? when we add Extended Latin
            this.text = iCombinations[this.text];
        }
    }

    hasClass(className: string): boolean {
        return utils.contains(this.classes, className);
    }

    /**
     * Creates a text node or span from a symbol node. Note that a span is only
     * created if it is needed.
     */
    toNode(): Node {
        const node = document.createTextNode(this.text);
        let span: any = null;

        if (this.italic > 0) {
            span = document.createElement("span");
            span.style.marginRight = this.italic + "em";
        }

        if (this.classes.length > 0) {
            span = span || document.createElement("span");
            span.className = createClass(this.classes);
        }

        for (const style in this.style) {
            if (this.style.hasOwnProperty(style)) {
                span = span || document.createElement("span");
                // $FlowFixMe Flow doesn't seem to understand span.style's type.
                span.style[style] = this.style[style];
            }
        }

        if (span) {
            span.appendChild(node);
            return span;
        } else {
            return node;
        }
    }

    /**
     * Creates markup for a symbol node.
     */
    toMarkup(): string {
        // TODO(alpert): More duplication than I'd like from
        // span.prototype.toMarkup and symbolNode.prototype.toNode...
        let needsSpan = false;

        let markup = "<span";

        if (this.classes.length) {
            needsSpan = true;
            markup += " class=\"";
            markup += utils.escape(createClass(this.classes));
            markup += "\"";
        }

        let styles = "";

        if (this.italic > 0) {
            styles += "margin-right:" + this.italic + "em;";
        }
        for (const style in this.style) {
            if (this.style.hasOwnProperty(style)) {
                styles += utils.hyphenate(style) + ":" + this.style[style] + ";";
            }
        }

        if (styles) {
            needsSpan = true;
            markup += " style=\"" + utils.escape(styles) + "\"";
        }

        const escaped = utils.escape(this.text);
        if (needsSpan) {
            markup += ">";
            markup += escaped;
            markup += "</span>";
            return markup;
        } else {
            return escaped;
        }
    }
    toReact(k?) {
        const escaped = utils.escape(this.text);
        if (this.classes.length || Object.getOwnPropertyNames(this.style).length || this.italic > 0) {
            let styles = {...this.style};
            if (this.italic > 0) {
                styles.marginRight = this.italic + "em";
            }
            return <span style={styles} className={createClass(this.classes)} key={k}>{escaped}</span>
        }
        else {
            return <>{escaped}</>
        }
    }
}

/**
 * SVG nodes are used to render stretchy wide elements.
 */
export class SvgNode implements VirtualNode {
    children: SvgChildNode[];
    attributes: { [k: string]: string };

    constructor(children?: SvgChildNode[], attributes?: { [k: string]: string }) {
        this.children = children || [];
        this.attributes = attributes || {};
    }

    toNode(): Node {
        const svgNS = "http://www.w3.org/2000/svg";
        const node = document.createElementNS(svgNS, "svg");

        // Apply attributes
        for (const attr in this.attributes) {
            if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
                node.setAttribute(attr, this.attributes[attr]);
            }
        }

        for (let i = 0; i < this.children.length; i++) {
            node.appendChild(this.children[i].toNode());
        }
        return node;
    }

    toMarkup(): string {
        let markup = "<svg";

        // Apply attributes
        for (const attr in this.attributes) {
            if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
                markup += ` ${attr}='${this.attributes[attr]}'`;
            }
        }

        markup += ">";

        for (let i = 0; i < this.children.length; i++) {
            markup += this.children[i].toMarkup();
        }

        markup += "</svg>";

        return markup;

    }
    toReact(k?)  {
        return <svg key={k} {...this.attributes}>{this.children.map((x,i) => x.toReact(i))}</svg>
    }
}

export class PathNode implements VirtualNode {
    pathName: string;
    alternate?: string;

    constructor(pathName: string, alternate?: string) {
        this.pathName = pathName;
        this.alternate = alternate;  // Used only for tall \sqrt
    }

    toNode(): Node {
        const svgNS = "http://www.w3.org/2000/svg";
        const node = document.createElementNS(svgNS, "path");

        if (this.alternate) {
            node.setAttribute("d", this.alternate);
        } else {
            node.setAttribute("d", svgGeometry.path[this.pathName]);
        }

        return node;
    }

    toMarkup(): string {
        if (this.alternate) {
            return `<path d='${this.alternate}'/>`;
        } else {
            return `<path d='${svgGeometry.path[this.pathName]}'/>`;
        }
    }

    toReact(k?) {
            return <path key={k} d={this.alternate || svgGeometry.path[this.pathName]}/>;
    }
}

export class LineNode implements VirtualNode {
    attributes: { [k: string]: string };

    constructor(attributes?: { [k: string]: string }) {
        this.attributes = attributes || {};
    }

    toNode(): Node {
        const svgNS = "http://www.w3.org/2000/svg";
        const node = document.createElementNS(svgNS, "line");

        // Apply attributes
        for (const attr in this.attributes) {
            if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
                node.setAttribute(attr, this.attributes[attr]);
            }
        }

        return node;
    }

    toMarkup(): string {
        let markup = "<line";

        for (const attr in this.attributes) {
            if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
                markup += ` ${attr}='${this.attributes[attr]}'`;
            }
        }

        markup += "/>";

        return markup;
    }
    toReact(k?){
        return <line key={k} {...this.attributes}/>
    }
}

export function assertSymbolDomNode(
    group: HtmlDomNode,
): SymbolNode {
    if (group instanceof SymbolNode) {
        return group;
    } else {
        throw new Error(`Expected symbolNode but got ${String(group)}.`);
    }
}

export function assertSpan(
    group: HtmlDomNode,
): Span<HtmlDomNode> {
    if (group instanceof Span) {
        return group;
    } else {
        throw new Error(`Expected span<HtmlDomNode> but got ${String(group)}.`);
    }
}

export const defines = (globalThis["defines"] = new Map([
  ["global", globalThis],
  ["location", globalThis.location],
  ["url", globalThis.location],
]));

export const getDeepQuery = (obj, query) =>
  query.split(" ").reduce((prev, prop) => {
    switch (true) {
      case typeof prev === "string":
        return prev[prop];
      case typeof prev === "function":
        return prev();
      case prev instanceof Map:
        return prev.get(prop);
      default:
        return prev != null ? Reflect.get(prev, prop) : prev;
    }
  }, obj);

customElements.define(
  "html-val",
  class extends HTMLElement {
    constructor() {
      super();

      const scope = defines;
      const name = this.getAttribute("name");

      if (!name) {
        throw new Error("Attribute name required!");
      }

      if (this.hasChildNodes()) {
        const fragment = document.createDocumentFragment();
        fragment.append.apply(fragment, this.childNodes);
        scope.set(name, fragment);
        this.remove();
      } else {
        let content = getDeepQuery(scope, name);

        if (content instanceof Node) content = content.cloneNode(true);
        this.replaceWith(content);
      }
    }
  }
);

customElements.define(
  "html-element",
  class extends HTMLTemplateElement {
    connectedCallback() {
      this.defineCustomElement();
    }

    defineCustomElement() {
      const template = this;
      const elementName = template.getAttribute("name");

      if (!elementName) {
        throw new Error("name must be defined");
      }

      customElements.define(
        elementName,
        class extends HTMLElement {
          constructor() {
            super();
            template.content;
            this.attachShadow({ mode: "open" }).appendChild(
              template.content.cloneNode(true)
            );
          }
        }
      );
    }
  },
  { extends: "template" }
);

const el = document.createElement("span");

// https://stackoverflow.com/a/67243723
const toKebabCase = (str) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase()
  );

Object.keys(el.style)
  .map(toKebabCase)
  .map((name) => {
    customElements.define(
      `html-${name}`,
      class extends HTMLElement {
        constructor() {
          super();
          const value = Array.from(this.attributes, (attr) => {
            return [attr.name, attr.value].join(" ");
          }).join(" ");

          this.style.setProperty(name, value);
        }
      }
    );
  });

export const HTMLDefines = Symbol("html scope defines");

export const defines = (globalThis[HTMLDefines] = new Map([
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

      const name = this.getAttribute("name");
      const attr = this.getAttribute("attr");
      const scope = attr != null ? this.parentElement : defines;

      if (name != null && attr != null) {
        throw new Error("Only one attribute `name` or `attr` can be defined.");
      }

      if (!name && !attr) {
        throw new Error("Attributes `name` or `attr` are required!");
      }

      const query = name ?? attr;

      if (this.hasChildNodes()) {
        const fragment = document.createDocumentFragment();
        fragment.append.apply(fragment, this.childNodes);
        scope.set(query, fragment);
        this.remove();
      } else {
        let content = getDeepQuery(scope, query) ?? "";

        if (content instanceof Node) content = content.cloneNode(true);
        this.replaceWith(content);
      }
    }
  },
);

class LifecycleEvent extends Event {
  constructor(type, data = {}, eventInitDict = undefined) {
    super(type, eventInitDict);
    Object.assign(this, data);
  }
}

customElements.define(
  "html-element",
  class extends HTMLTemplateElement {
    connectedCallback() {
      this.defineCustomElement();
    }

    defineCustomElement() {
      const template = this;
      const elementName = template.getAttribute("name");
      const observedAttributes =
        template.getAttribute("observed-attributes")?.split(",")
          .map((attr) => attr.trim()) ?? [];

      if (!elementName) {
        throw new Error("name must be defined");
      }

      customElements.define(
        elementName,
        class extends HTMLElement {
          static get observedAttributes() {
            return observedAttributes;
          }

          constructor() {
            super();
            this.attachShadow({ mode: "open" }).appendChild(
              template.content.cloneNode(true),
            );
          }

          connectedCallback() {
            this.dispatchEvent(new LifecycleEvent("connected"));
          }

          disconnectedCallback() {
            this.dispatchEvent(new LifecycleEvent("disconnected"));
          }

          adoptedCallback() {
            this.dispatchEvent(new LifecycleEvent("adopted"));
          }

          attributeChangedCallback(name, oldValue, newValue) {
            this.dispatchEvent(
              new LifecycleEvent("attributechanged", {
                name,
                oldValue,
                newValue,
              }),
            );
          }
        },
      );
    }
  },
  { extends: "template" },
);

const el = document.createElement("span");

// https://stackoverflow.com/a/67243723
const toKebabCase = (str) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase(),
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
      },
    );
  });

import m, { Children, ClassComponent, Vnode, VnodeDOM } from "mithril"

export interface SingleLineTextFieldAttrs {
	value: string
	disabled?: boolean
	/**
	 * Callback fired whenever the input is interacted with.
	 * This property is mandatory if the input is interactive (disabled = false).
	 * @example
	 * // Save the typed value to a model object
	 * const callback = (typedValue: string) => model.value = typedValue;
	 * m(SingleLineTextField, {oninput: callback})
	 * @param {string} newValue - String value typed on the input field
	 * @returns {unknown} Return type depends on the callback provided
	 */
	oninput?: (newValue: string) => unknown
	placeholder?: string
	classes?: Array<string>
	style?: Partial<Pick<CSSStyleDeclaration, "padding" | "fontSize">>
}

type HTMLElementWithAttrs = Partial<Pick<m.Attributes, "class"> & Omit<HTMLElement, "style"> & SingleLineTextFieldAttrs>

/**
 * Simple single line input field component
 * @see Component attributes: {SingleLineTextFieldAttrs}
 * @example
 * m(SingleLineTextField, {
 *     value: model.value,
 *     oninput: (newValue: string) => {
 *         model.value = newValue
 *     },
 *     placeholder: lang.get("placeholder"),
 *     disabled: model.isReadonly,
 *     classes: ["custom-text-color"], // Adding new styles
 *     style: {
 *         "font-size": px(size.font_size_base * 1.25) // Overriding the component style
 *     }
 * }),
 */
export class SingleLineTextField implements ClassComponent<SingleLineTextFieldAttrs> {
	domInput!: HTMLInputElement

	oncreate(vnode: VnodeDOM<SingleLineTextFieldAttrs, this>): any {
		this.domInput = vnode.dom as HTMLInputElement
	}

	view({ attrs }: Vnode<SingleLineTextFieldAttrs, this>): Children | void | null {
		return m("input.tutaui-text-field", {
			value: attrs.value,
			disabled: attrs.disabled ?? false,
			oninput: () => {
				if (!attrs.oninput) {
					console.error("oninput fired without a handler function")
					return
				}
				attrs.oninput(this.domInput.value)
			},
			placeholder: attrs.placeholder,
			class: this.resolveClasses(attrs.classes, attrs.disabled),
			style: attrs.style,
		} satisfies HTMLElementWithAttrs)
	}

	private resolveClasses(classes: Array<string> = [], disabled: boolean = false): string {
		const classList = [...classes]
		if (disabled) {
			classList.push("disabled")
		}

		return classList.join(" ")
	}
}

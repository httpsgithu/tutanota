import m, { Children, Component, Vnode } from "mithril"
import { px, size } from "../../size.js"
import { ExpanderButton, ExpanderPanel } from "../Expander.js"
import { TextField } from "../TextField.js"
import { lang } from "../../../misc/LanguageViewModel.js"
import { hexToHSL, hslToHex, isColorLight, isValidCSSHexColor, MAX_HUE_ANGLE, normalizeHueAngle } from "../Color.js"
import { ColorPickerModel } from "./ColorPickerModel.js"
import { client } from "../../../misc/ClientDetector.js"
import { theme } from "../../theme.js"
import { assertNotNull, filterInt } from "@tutao/tutanota-utils"
import { Keys, TabIndex } from "../../../api/common/TutanotaConstants"
import { isKeyPressed } from "../../../misc/KeyManager"

const HUE_GRADIENT_BORDER_WIDTH = 1
const HUE_GRADIENT_HEIGHT = 40

const enum PaletteIndex {
	defaultVariant = 2,
	customVariant = -1,
}

export type ColorPickerViewAttrs = {
	/**
	 * Initial value can be empty, a random color will be generated by the ColorPicker
	 * */
	value: string
	/**
	 * Called whenever the selected color changes
	 */
	onselect: (color: string) => void
}

export class ColorPickerView implements Component<ColorPickerViewAttrs> {
	private readonly palette = Array<string | null>(ColorPickerModel.PALETTE_SIZE).fill(null)
	private readonly model: ColorPickerModel = new ColorPickerModel(!isColorLight(theme.content_bg))
	private selectedHueAngle = Math.floor(Math.random() * MAX_HUE_ANGLE)
	private fallbackVariantIndex: number = PaletteIndex.defaultVariant
	private isAdvanced = false
	private customColorHex = ""

	private huePickerDom: HTMLElement | null = null
	private hueImgDom: HTMLElement | null = null
	private hueSliderDom: HTMLElement | null = null
	private hueWindowDom: HTMLElement | null = null

	constructor(vnode: Vnode<ColorPickerViewAttrs>) {
		const { value: selectedColor, onselect } = vnode.attrs

		if (selectedColor) {
			const { h, s, l } = hexToHSL(selectedColor)
			const variantIndex = this.model.getVariantIndexBySL(s, l)

			// in case of palette color, selectedHueAngle is the one that was used to generate the palette
			this.selectedHueAngle = variantIndex != null ? normalizeHueAngle(h - this.model.paletteSchema.hueShift[variantIndex]) : h
			this.generatePalette()
			this.customColorHex = selectedColor
			if (variantIndex != null) {
				this.fallbackVariantIndex = variantIndex
			}

			this.isAdvanced = variantIndex == null || this.palette[variantIndex] !== selectedColor
		} else {
			this.generatePalette()
			const defaultColor = assertNotNull(this.palette[PaletteIndex.defaultVariant], "no default palette color variant")
			this.customColorHex = defaultColor
			onselect(defaultColor)
		}
	}

	view(vnode: Vnode<ColorPickerViewAttrs>): Children {
		const attrs = vnode.attrs

		return m(".color-picker", [
			this.renderHuePicker(attrs.onselect),
			m(
				".flex.wrap.full-width.items-center.justify-between.p0.plr-s",
				{
					style: {
						rowGap: px(size.vpad_xs),
						marginTop: px(12),
					},
				},
				this.palette.map((color, i) =>
					this.renderColorOption({
						color: assertNotNull(color, `palette color ${i} not generated`),
						index: i,
						selectedColor: attrs.value,
						onselect: attrs.onselect,
						// add right divider to first color option
						className: i === 0 ? ".pr-vpad-s.mr-hpad-small" : undefined,
						style:
							i === 0
								? {
										borderRight: `2px solid ${theme.content_border}`,
								  }
								: undefined,
					}),
				),
			),
			m("", [
				m(ExpanderButton, {
					label: "advanced_label",
					expanded: this.isAdvanced,
					onExpandedChange: (expanded) => this.handleOnExpandedChange(expanded, attrs),
					style: {
						marginLeft: "auto",
					},
				}),
				m(
					ExpanderPanel,
					{
						expanded: this.isAdvanced,
					},
					this.renderCustomColorContainer(attrs),
				),
			]),
		])
	}

	private handleOnExpandedChange(expanded: boolean, attrs: ColorPickerViewAttrs) {
		if (expanded && isValidCSSHexColor(this.customColorHex)) {
			attrs.onselect(this.customColorHex)
		} else {
			let variantIndex: number | undefined = undefined
			if (isValidCSSHexColor(this.customColorHex)) {
				const { s, l } = hexToHSL(this.customColorHex)
				variantIndex = this.model.getVariantIndexBySL(s, l)
			}

			const fallbackColor = assertNotNull(
				this.palette[variantIndex ?? this.fallbackVariantIndex],
				`no fallback color at [${variantIndex} ?? ${this.fallbackVariantIndex}]`,
			)
			attrs.onselect(fallbackColor)
		}
		this.isAdvanced = expanded
	}

	private renderCustomColorContainer(attrs: ColorPickerViewAttrs) {
		return m(".custom-color-container.flex.items-start.gap-hpad", [
			m("", [
				m(TextField, {
					value: this.customColorHex.replace("#", ""),
					label: "hexCode_label",
					oninput: (v) => this.handleCustomHexInput(v, attrs),
				}),
				!isValidCSSHexColor(this.customColorHex) && m(".small", lang.get("invalidInputFormat_msg")),
			]),
			this.renderColorOption({
				color: this.customColorHex,
				index: PaletteIndex.customVariant,
				selectedColor: attrs.value,
				onselect: (color) => {
					this.postionSliderOnHue(assertNotNull(this.hueImgDom), assertNotNull(this.hueSliderDom))
					attrs.onselect(color)
				},
				className: ".mt-m",
			}),
		])
	}

	private handleCustomHexInput(inputValue: string, attrs: ColorPickerViewAttrs) {
		const newValue = inputValue.trim().replaceAll("#", "").slice(0, 6)
		const hexCode = "#" + newValue
		this.customColorHex = hexCode

		if (!isValidCSSHexColor(hexCode)) {
			attrs.onselect(assertNotNull(this.palette[this.fallbackVariantIndex], `no fallback color at ${this.fallbackVariantIndex}`))
			return
		}

		const { h, s, l } = hexToHSL(hexCode)
		const variantIndex = this.model.getVariantIndexBySL(s, l)

		if (variantIndex != null) {
			this.fallbackVariantIndex = variantIndex
		}

		this.selectedHueAngle = variantIndex != null ? normalizeHueAngle(h - this.model.paletteSchema.hueShift[variantIndex]) : h
		this.postionSliderOnHue(assertNotNull(this.hueImgDom), assertNotNull(this.hueSliderDom))
		this.generatePalette()
		attrs.onselect(hexCode)
	}

	private renderColorOption(attrs: {
		color: string
		index: number
		selectedColor: ColorPickerViewAttrs["value"]
		onselect: ColorPickerViewAttrs["onselect"]
		className?: string
		style?: Record<string, string>
	}): Children {
		const { color, index, selectedColor, className, style } = attrs

		const isOptionSelected = color === selectedColor
		let isColorValid = true
		if (index === PaletteIndex.customVariant) {
			isColorValid = isValidCSSHexColor(color)
		}

		const handleSelection = () => {
			if (!isColorValid) {
				return
			}

			if (index === PaletteIndex.customVariant && isColorValid) {
				const { h, s, l } = hexToHSL(color)
				const variantIndex = this.model.getVariantIndexBySL(s, l)

				this.selectedHueAngle = variantIndex != null ? normalizeHueAngle(h - this.model.paletteSchema.hueShift[variantIndex]) : h
				this.generatePalette()
			} else {
				this.fallbackVariantIndex = index
				this.customColorHex = color
			}

			attrs.onselect(color)
		}

		return m(
			`.color-option${className ?? ""}`,
			{
				className: isOptionSelected ? "selected" : "",
				style,
			},
			m(
				".border-radius-m",
				{
					style: {
						padding: "1px",
						borderWidth: "2px",
						borderStyle: "solid",
						borderColor: isOptionSelected ? theme.content_button_selected : "transparent",
					},
				},
				m(".border-radius", {
					tabIndex: TabIndex.Default,
					role: "radio",
					ariaLabel: index === PaletteIndex.customVariant ? lang.get("customColor_label") : `${lang.get("variant_label")} ${index}`,
					ariaChecked: isOptionSelected,
					style: {
						width: px(30),
						height: px(30),
						borderWidth: "1px",
						borderStyle: "solid",
						borderColor: isOptionSelected ? "transparent" : theme.content_border,
						backgroundColor: isColorValid ? color : theme.content_border,
					},
					onkeydown: (e: KeyboardEvent) => {
						if (isKeyPressed(e.key, Keys.SPACE)) {
							e.preventDefault()
							handleSelection()
						}
					},
					onclick: handleSelection,
				}),
			),
		)
	}

	private renderHuePicker(onselect: ColorPickerViewAttrs["onselect"]): Children {
		const a11yHueShiftStep = 5

		return m(
			".rel.overflow-hidden",
			{
				style: {
					position: "relative",
				},
				onkeydown: (e: KeyboardEvent) => {
					e.preventDefault()
					const isRightMove = isKeyPressed(e.key, Keys.RIGHT)
					const isLeftMove = isKeyPressed(e.key, Keys.LEFT)
					const isStill = isLeftMove && isRightMove

					if (!isStill && (isRightMove || isLeftMove)) {
						// holding down shift allows finer hue adjustment
						const step = e.shiftKey ? 1 : a11yHueShiftStep
						let hueStep = isLeftMove ? -step : step
						this.selectedHueAngle = normalizeHueAngle(this.selectedHueAngle + hueStep)

						this.postionSliderOnHue(assertNotNull(this.hueImgDom), assertNotNull(this.hueSliderDom))
						this.toggleHueWindow(true)
						this.generatePalette()

						if (!this.isAdvanced || !isValidCSSHexColor(this.customColorHex)) {
							onselect(assertNotNull(this.palette[this.fallbackVariantIndex], `no fallback color at ${this.fallbackVariantIndex}`))
						}
					}
				},
				onkeyup: () => this.toggleHueWindow(false),
				oncreate: (vnode) => {
					this.huePickerDom = vnode.dom as HTMLElement
				},
			},
			[
				// range input used to allow hue to be easily changed on a screen reader
				m("input.fill-absolute.no-hover", {
					type: "range",
					min: 0,
					max: MAX_HUE_ANGLE,
					step: a11yHueShiftStep,
					tabIndex: TabIndex.Default,
					role: "slider",
					ariaLabel: lang.get("hue_label"),
					style: {
						opacity: 0,
					},
					value: `${this.selectedHueAngle}`,
					oninput: (e: InputEvent) => {
						this.selectedHueAngle = filterInt((e.target as HTMLInputElement).value)

						this.postionSliderOnHue(assertNotNull(this.hueImgDom), assertNotNull(this.hueSliderDom))
						this.generatePalette()
						if (!this.isAdvanced || !isValidCSSHexColor(this.customColorHex)) {
							onselect(assertNotNull(this.palette[this.fallbackVariantIndex], `no fallback color at ${this.fallbackVariantIndex}`))
						}
					},
				}),
				// hueGradient
				m(
					".full-width.border-radius.overflow-hidden",
					{
						style: {
							borderStyle: "solid",
							borderColor: theme.content_border,
							backgroundColor: theme.content_border,
							borderWidth: px(HUE_GRADIENT_BORDER_WIDTH),
							height: px(HUE_GRADIENT_HEIGHT),
						},
					},
					m("img.block.full-width", {
						src: `${window.tutao.appState.prefixWithoutFile}/images/color-hue-picker/hue-gradient-${
							!isColorLight(theme.content_bg) ? "dark" : "light"
						}.png`,
						alt: "",
						draggable: false,
						style: {
							height: px(HUE_GRADIENT_HEIGHT),
						},
						oncreate: (vnode) => {
							this.hueImgDom = vnode.dom as HTMLElement
						},
						onupdate: (vnode) => {
							if (this.hueSliderDom != null && !this.hueSliderDom.style.left) {
								// sets the position of the hueSlider on first render. to do it we need hueImgDom's width
								const hueImgDom = vnode.dom as HTMLElement
								this.postionSliderOnHue(hueImgDom, this.hueSliderDom)
							}
						},
						[client.isTouchSupported() ? "ontouchstart" : "onpointerdown"]: (e: PointerEvent | TouchEvent) => {
							const abortController = new AbortController()
							const hueImgDom = e.target as HTMLElement

							hueImgDom.addEventListener(client.isTouchSupported() ? "touchmove" : "pointermove", (e) => this.handleHueChange(e, hueImgDom), {
								signal: abortController.signal,
							})

							const endListener = () => {
								abortController.abort()
								this.generatePalette()
								this.toggleHueWindow(false)

								if (!this.isAdvanced || !isValidCSSHexColor(this.customColorHex)) {
									onselect(assertNotNull(this.palette[this.fallbackVariantIndex], `no fallback color at ${this.fallbackVariantIndex}`))
								}
								m.redraw()
							}

							hueImgDom.addEventListener(client.isTouchSupported() ? "touchcancel" : "pointercancel", endListener, {
								signal: abortController.signal,
							})
							document.addEventListener(client.isTouchSupported() ? "touchend" : "pointerup", endListener, { signal: abortController.signal })

							this.handleHueChange(e, hueImgDom)
							this.toggleHueWindow(true)
						},
					}),
				),
				// hueSlider
				m(
					".abs",
					{
						style: {
							width: "0px",
							bottom: px(HUE_GRADIENT_BORDER_WIDTH),
						},
						oncreate: (vnode) => {
							this.hueSliderDom = vnode.dom as HTMLElement
						},
					},
					[
						// hueWindow
						m(".border.circle", {
							style: {
								width: px(24),
								height: px(24),
								transform: "translateX(-50%)",
								backgroundColor: this.model.getHueWindowColor(this.selectedHueAngle) ?? theme.content_border,
							},
							oncreate: (vnode) => {
								this.hueWindowDom = vnode.dom as HTMLElement
							},
						}),
						// hueStem
						m("", {
							style: {
								width: px(2),
								height: px(HUE_GRADIENT_HEIGHT),
								transform: "translateX(-50%)",
								backgroundColor: theme.content_border,
							},
						}),
					],
				),
			],
		)
	}

	private toggleHueWindow(show: boolean) {
		assertNotNull(this.huePickerDom).style.overflow = show ? "visible" : "hidden"
	}

	private postionSliderOnHue(hueImgDom: HTMLElement, hueSliderDom: HTMLElement) {
		const hueGradientWidth = hueImgDom.getBoundingClientRect().width
		hueSliderDom.style.left = `${Math.floor((this.selectedHueAngle / MAX_HUE_ANGLE) * hueGradientWidth) + HUE_GRADIENT_BORDER_WIDTH}px`
		assertNotNull(this.hueWindowDom).style.backgroundColor = this.model.getHueWindowColor(this.selectedHueAngle)
	}

	private handleHueChange = (e: PointerEvent | TouchEvent, hueImgDom: HTMLElement) => {
		const hueImgDomRect = hueImgDom.getBoundingClientRect()
		const eClientX = "clientX" in e ? e.clientX : e.touches[0].clientX
		const posX = Math.floor(eClientX - hueImgDomRect.left + HUE_GRADIENT_BORDER_WIDTH)
		this.selectedHueAngle = Math.floor((posX / hueImgDomRect.width) * MAX_HUE_ANGLE)

		if (this.hueSliderDom) {
			this.hueSliderDom.style.left = `${posX}px`
		}
		if (this.hueWindowDom) {
			this.hueWindowDom.style.backgroundColor = this.model.getHueWindowColor(this.selectedHueAngle)
		}
	}

	private generatePalette() {
		for (let i = 0; i < ColorPickerModel.PALETTE_SIZE; i++) {
			this.palette[i] = hslToHex(this.model.getColor(this.selectedHueAngle, i))
		}
	}
}

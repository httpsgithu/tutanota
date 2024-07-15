import { deviceConfig } from "../misc/DeviceConfig"
import { assertMainOrNodeBoot, isApp, isDesktop, isTest } from "../api/common/Env"
import type { HtmlSanitizer } from "../misc/HtmlSanitizer"
import { NativeThemeFacade, ThemeController, WebThemeFacade } from "./ThemeController"
import { isColorLight } from "./base/Color"
import { logo_text_bright_grey, logo_text_dark_grey } from "./builtinThemes"
import { getLogoSvg } from "./base/Logo"

assertMainOrNodeBoot()

/**
 * Unique identifier for a theme.
 * There are few built-in ones and there are whitelabel ones.
 * Whitelabel themes use domain name as an ID.
 */
export type ThemeId = "light" | "dark" | "blue" | string
export type BaseThemeId = "light" | "dark"
/**
 * This one is not attached to any single theme but is persisted and is shown to the user as a preference.
 */
export type ThemePreference = ThemeId | "auto:light|dark"
export type Theme = {
	themeId: ThemeId
	logo: string
	button_bubble_bg: string
	button_bubble_fg: string
	content_bg: string
	content_fg: string
	content_button: string
	content_button_selected: string
	content_button_icon: string
	content_button_icon_selected: string
	content_button_icon_bg?: string
	content_accent: string
	content_border: string
	content_message_bg: string
	header_bg: string
	header_box_shadow_bg: string
	header_button: string
	header_button_selected: string
	list_bg: string
	list_alternate_bg: string
	list_accent_fg: string
	list_message_bg: string
	list_border: string
	modal_bg: string
	elevated_bg?: string
	navigation_bg: string
	navigation_border: string
	navigation_button: string
	navigation_button_icon_bg?: string
	navigation_button_selected: string
	navigation_button_icon: string
	navigation_button_icon_selected: string
	navigation_menu_bg?: string
	navigation_menu_icon?: string
}

const themeSingleton = {}

// ThemeController.updateTheme updates the object in place, so this will always be current.
// There are few alternative ways this could have been implemented:
//  * make each property on this singleton a getter that defers to themeController
//  * make this singleton a proxy that does the same thing
// We keep this singleton available because it is convenient to refer to, and already everywhere in the code before the addition of ThemeController.
export const theme = themeSingleton as Theme

export const themeOptions = [
	{
		name: "systemThemePref_label",
		value: "auto:light|dark",
	},
	{
		name: "light_label",
		value: "light",
	},
	{
		name: "dark_label",
		value: "dark",
	},
	{
		name: "blue_label",
		value: "blue",
	},
] as const

export function getContentButtonIconBackground(): string {
	return theme.content_button_icon_bg || theme.content_button // fallback for the new color content_button_icon_bg
}

export function getNavButtonIconBackground(): string {
	return theme.navigation_button_icon_bg || theme.navigation_button // fallback for the new color content_button_icon_bg
}

export function getElevatedBackground(): string {
	return theme.elevated_bg || theme.content_bg
}

export function getNavigationMenuBg(): string {
	return theme.navigation_menu_bg || theme.navigation_bg
}

export function getNavigationMenuIcon(): string {
	return theme.navigation_menu_icon || theme.navigation_button_icon
}

export function getColouredTutanotaLogo(): string {
	return getLogoSvg(theme.content_accent, isColorLight(theme.content_bg) ? logo_text_dark_grey : logo_text_bright_grey)
}

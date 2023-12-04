import { CalendarEvent } from "../../api/entities/tutanota/TypeRefs.js"
import m, { Children, Component, Vnode } from "mithril"
import { formatMonthWithFullYear } from "../../misc/Formatter.js"
import { hexToRgb } from "../../gui/base/Color.js"
import { theme } from "../../gui/theme.js"
import { Icon } from "../../gui/base/Icon.js"
import { Icons } from "../../gui/base/icons/Icons.js"
import { BootIcons } from "../../gui/base/icons/BootIcons.js"
import { incrementMonth } from "@tutao/tutanota-utils"
import { DaySelector } from "./DaySelector.js"

export interface DaySelectorSidebarAttrs {
	selectedDate: Date
	onDateSelected: (date: Date, dayClick: boolean) => unknown
	startOfTheWeekOffset: number
	eventsForDays: Map<number, Array<CalendarEvent>>
	showDaySelection: boolean
	highlightToday: boolean
	highlightSelectedWeek: boolean
}

export class DaySelectorSidebar implements Component<DaySelectorSidebarAttrs> {
	private currentDate: Date
	private openDate: Date

	constructor(vnode: Vnode<DaySelectorSidebarAttrs>) {
		this.currentDate = vnode.attrs.selectedDate
		this.openDate = vnode.attrs.selectedDate
	}

	view(vnode: Vnode<DaySelectorSidebarAttrs>): Children {
		if (vnode.attrs.selectedDate !== this.openDate) {
			this.currentDate = vnode.attrs.selectedDate
			this.openDate = vnode.attrs.selectedDate
		}

		return m(
			".plr-m.pt-s",
			m(".elevated-bg.plr.pt-s.pb-m.border-radius.flex.flex-column", [
				this.renderPickerHeader(this.currentDate),
				m(".flex-grow.overflow-hidden", [
					m(DaySelector, {
						selectedDate: this.currentDate,
						onDateSelected: vnode.attrs.onDateSelected,
						wide: false,
						startOfTheWeekOffset: vnode.attrs.startOfTheWeekOffset,
						isDaySelectorExpanded: true,
						eventsForDays: vnode.attrs.eventsForDays,
						handleDayPickerSwipe: (isNext) => {
							this.onMonthChange(isNext)
							m.redraw()
						},
						showDaySelection: vnode.attrs.showDaySelection,
						highlightToday: vnode.attrs.highlightToday,
						highlightSelectedWeek: vnode.attrs.highlightSelectedWeek,
						useNarrowWeekName: true,
					}),
				]),
			]),
		)
	}

	private renderPickerHeader(date: Date): Children {
		return m(".flex.flex-space-between.pb-s.items-center", [
			this.renderSwitchMonthArrowIcon(false),
			m(
				".b",
				{
					style: {
						fontSize: "14px",
						marginLeft: "6px",
					},
				},
				formatMonthWithFullYear(date),
			),
			this.renderSwitchMonthArrowIcon(true),
		])
	}

	private renderSwitchMonthArrowIcon(forward: boolean): Children {
		const bgColor = hexToRgb(theme.content_button)
		return m(
			"button.icon.flex.justify-center.items-center.click.state-bg.mlr-s",
			{
				onclick: () => this.onMonthChange(forward),
				style: {
					borderRadius: "50%",
					fill: theme.content_fg,
					width: "20px",
					height: "20px",
					tabIndex: 0,
				},
			},
			m(Icon, {
				icon: forward ? Icons.ArrowForward : BootIcons.Back,
				style: {
					fill: theme.content_fg,
				},
			}),
		)
	}

	private onMonthChange(forward: boolean) {
		this.currentDate = incrementMonth(this.currentDate, forward ? 1 : -1)
	}
}

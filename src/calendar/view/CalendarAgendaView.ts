import m, { Children, Component, Vnode } from "mithril"
import { neverNull } from "@tutao/tutanota-utils"
import { lang } from "../../misc/LanguageViewModel"
import { getEventColor, getTimeZone } from "../date/CalendarUtils"
import type { CalendarEvent } from "../../api/entities/tutanota/TypeRefs.js"
import type { GroupColors } from "./CalendarView"
import type { CalendarEventBubbleClickHandler } from "./CalendarViewModel"
import { styles } from "../../gui/styles.js"
import { DateTime } from "luxon"
import { CalendarAgendaItemView } from "./CalendarAgendaItemView.js"
import ColumnEmptyMessageBox from "../../gui/base/ColumnEmptyMessageBox.js"
import { BootIcons } from "../../gui/base/icons/BootIcons.js"
import { theme } from "../../gui/theme.js"
import { px, size } from "../../gui/size.js"
import { DaySelector } from "../date/DaySelector.js"
import { EventPreviewView } from "./eventpopup/EventPreviewView.js"
import type { HtmlSanitizer } from "../../misc/HtmlSanitizer.js"

type Attrs = {
	selectedDate: Date
	/**
	 * maps start of day timestamp to events on that day
	 */
	eventsForDays: Map<number, Array<CalendarEvent>>
	amPmFormat: boolean
	onEventClicked: CalendarEventBubbleClickHandler
	groupColors: GroupColors
	hiddenCalendars: ReadonlySet<Id>
	startOfTheWeekOffset: number
	isDaySelectorExpanded: boolean
	/** when the user explicitly pressed on a day to show */
	onShowDate: (date: Date) => unknown
	/**  when the selected date was changed  */
	onDateSelected: (date: Date) => unknown
	htmlSanitizer: Promise<HtmlSanitizer>
}

export class CalendarAgendaView implements Component<Attrs> {
	private selectedEvent: CalendarEvent | null = null
	private eventDescription: string = ""
	private htmlSanitizer: Promise<HtmlSanitizer>

	constructor(vnode: Vnode<Attrs>) {
		this.htmlSanitizer = vnode.attrs.htmlSanitizer
	}

	view({ attrs }: Vnode<Attrs>): Children {
		const selectedDate = attrs.selectedDate

		let containerStyle

		if (styles.isDesktopLayout()) {
			containerStyle = {
				marginLeft: "5px",
				overflow: "hidden",
				marginBottom: px(size.hpad_large),
			}
		} else {
			containerStyle = {}
		}

		return m(".fill-absolute.flex.col" + (styles.isDesktopLayout() ? ".mlr-l" : ".mlr-safe-inset"), { style: containerStyle }, [
			this.renderDateSelector(attrs, selectedDate),
			m(
				`.rel.flex-grow.flex.col` + (styles.isDesktopLayout() ? "" : ".content-bg.scroll.border-radius-top-left-big.border-radius-top-right-big"),
				this.renderAgenda(attrs),
			),
		])
	}

	private renderDateSelector(attrs: Attrs, selectedDate: Date): Children {
		// This time width is used to create a container above the day slider
		// So the hidden dates "seems" to be following the same margin of the view
		const timeWidth = !styles.isDesktopLayout() ? size.calendar_hour_width_mobile : size.calendar_hour_width
		return styles.isDesktopLayout()
			? null
			: m(
					".flex.full-width.items-center",
					m(
						".full-width.overflow-hidden",
						{
							style: {
								"margin-left": px(timeWidth),
							},
						},
						[
							m(
								".pb-s.full-width",

								m(DaySelector, {
									eventsForDays: attrs.eventsForDays,
									selectedDate: selectedDate,
									onDateSelected: (selectedDate: Date) => {
										attrs.onDateSelected(selectedDate)
									},
									wide: true,
									startOfTheWeekOffset: attrs.startOfTheWeekOffset,
									isDaySelectorExpanded: attrs.isDaySelectorExpanded,
									handleDayPickerSwipe: (isNext: boolean) => {
										const sign = isNext ? 1 : -1
										const duration = {
											month: sign * (attrs.isDaySelectorExpanded ? 1 : 0),
											week: sign * (attrs.isDaySelectorExpanded ? 0 : 1),
										}

										attrs.onDateSelected(DateTime.fromJSDate(attrs.selectedDate).plus(duration).toJSDate())
									},
									showDaySelection: true,
									highlightToday: true,
									highlightSelectedWeek: false,
									useNarrowWeekName: styles.isSingleColumnLayout(),
								}),
							),
						],
					),
			  )
	}

	private renderEventList(attrs: Attrs): Children {
		const events = (attrs.eventsForDays.get(attrs.selectedDate.getTime()) ?? []).filter((e) => !attrs.hiddenCalendars.has(neverNull(e._ownerGroup)))
		if (events.length === 0) {
			return m(ColumnEmptyMessageBox, {
				icon: BootIcons.Calendar,
				message: "noEntries_msg",
				color: theme.list_message_bg,
			})
		} else {
			return m(
				".pt-s.flex.mlr.mb-s.col",
				{ style: { ...(!styles.isDesktopLayout() ? { marginLeft: px(size.calendar_hour_width_mobile) } : {}) } },
				this.renderEventsForDay(events, attrs.selectedDate, getTimeZone(), attrs.groupColors, attrs.onEventClicked),
			)
		}
	}

	private renderAgenda(attrs: Attrs): Children {
		if (!styles.isDesktopLayout()) return this.renderEventList(attrs)
		return m(".flex.flex-grow", [
			m(
				".content-bg.border-radius-big.flex-grow.rel",
				{
					style: {
						"min-width": px(size.second_col_min_width),
						"max-width": px(size.second_col_max_width),
					},
				},
				[this.renderEventList(attrs)],
			),
			m(
				".border-radius-big.ml-l.flex.flex-grow" + (this.selectedEvent == null ? "" : ".content-bg"),
				{
					style: {
						"min-width": px(size.third_col_min_width),
						"max-width": px(size.third_col_max_width),
						height: this.selectedEvent == null ? "100%" : "max-content",
					},
				},
				this.selectedEvent == null
					? m(
							".rel.flex-grow.height-100p",
							m(ColumnEmptyMessageBox, {
								icon: BootIcons.Calendar,
								message: () => lang.get("noEventSelect_msg"),
								color: theme.list_message_bg,
							}),
					  )
					: m(".flex-grow.plr-l.pt-s", [
							m(EventPreviewView, {
								event: this.selectedEvent,
								sanitizedDescription: this.eventDescription,
							}),
					  ]),
			),
		])
	}

	private renderEventsForDay(
		events: CalendarEvent[],
		day: Date,
		zone: string,
		colors: GroupColors,
		click: (event: CalendarEvent, domEvent: MouseEvent) => unknown,
	) {
		return events.length === 0
			? m(".mb-s", lang.get("noEntries_msg"))
			: m(
					".flex.col",
					{
						style: {
							gap: "3px",
						},
					},
					events.map((event) => {
						return m(
							"",
							m(CalendarAgendaItemView, {
								event: event,
								color: getEventColor(event, colors),
								click: (domEvent) => {
									if (styles.isDesktopLayout()) {
										this.htmlSanitizer.then((sanitizer) => {
											this.eventDescription = sanitizer.sanitizeHTML(event.description).html
											this.selectedEvent = event
										})
									} else {
										click(event, domEvent)
									}
								},
								zone,
								day: day,
							}),
						)
					}),
			  )
	}
}

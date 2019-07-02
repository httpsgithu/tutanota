//@flow


import m from "mithril"
import {px, size} from "../gui/size"
import {defaultCalendarColor} from "../api/common/TutanotaConstants"
import {CalendarEventBubble} from "./CalendarEventBubble"
import type {CalendarDay} from "./CalendarUtils"
import {eventEndsAfterDay, eventStartsBefore, getCalendarMonth, getDiffInDays, layOutEvents} from "./CalendarUtils"
import {getDateIndicator, getDayShifted, getStartOfDay} from "../api/common/utils/DateUtils"
import {lastThrow} from "../api/common/utils/ArrayUtils"
import {theme} from "../gui/theme"
import {ContinuingCalendarEventBubble} from "./ContinuingCalendarEventBubble"
import {styles} from "../gui/styles"
import {formatMonthWithYear} from "../misc/Formatter"
import {getEventEnd, getEventStart, isAllDayEvent} from "../api/common/utils/CommonCalendarUtils"

type CalendarMonthAttrs = {
	selectedDate: Date,
	onDateSelected: (date: Date) => mixed,
	eventsForDays: Map<number, Array<CalendarEvent>>,
	onNewEvent: (date: ?Date) => mixed,
	onEventClicked: (event: CalendarEvent) => mixed
}

const weekDaysHeight = 30
const dayHeight = 32

export class CalendarMonthView implements MComponent<CalendarMonthAttrs> {

	_monthDom: ?HTMLElement;

	view(vnode: Vnode<CalendarMonthAttrs>): Children {
		const {weekdays, weeks} = getCalendarMonth(vnode.attrs.selectedDate, 1, false)
		const today = getStartOfDay(new Date())
		return m(".fill-absolute.flex.col",
			[
				m(".mt-s.pr-l", [
					styles.isDesktopLayout() ? m("h1.calendar-day-content", formatMonthWithYear(vnode.attrs.selectedDate)) : null,
				]),
				m(".flex.pt-s.pb-s", {
					style: {
						height: px(weekDaysHeight)
					}
				}, weekdays.map((wd) => m(".flex-grow", m(".b.small.center", wd)))),
				m(".flex.col.flex-grow", {
					oncreate: (vnode) => {
						this._monthDom = vnode.dom
						m.redraw() // render week events needs height and width of days, schedule a redraw when dom is available.
					}
				}, weeks.map((week) => {
					return m(".flex.flex-grow.rel", [
						week.map(d => this._renderDay(vnode.attrs, d, today)),
						this._monthDom ? this._renderWeekEvents(vnode.attrs, week) : null,
					])
				}))
			])
	}

	_renderDay(attrs: CalendarMonthAttrs, d: CalendarDay, today: Date): Children {
		return m(".calendar-day.flex-grow.rel.overflow-hidden.fill-absolute.day-with-border"
			+ (d.paddingDay ? ".calendar-alternate-background" : ""), {
				key: d.date.getTime(),
				onclick: () => {
					if (styles.isDesktopLayout()) {
						const newDate = new Date(d.date)
						let hour = new Date().getHours()
						if (hour < 23) {
							hour++
						}
						newDate.setHours(hour, 0)
						attrs.onNewEvent(newDate)
					} else {
						attrs.onDateSelected(new Date(d.date))
					}
				},
			},
			m(".calendar-day-number" + getDateIndicator(d.date, attrs.selectedDate, today), String(d.day)),
		)
	}

	_renderWeekEvents(attrs: CalendarMonthAttrs, week: Array<CalendarDay>): Children {
		const events = new Set()
		week.forEach((day) => {
			const dayEvents = attrs.eventsForDays.get(day.date.getTime())
			dayEvents && dayEvents.forEach(e => events.add(e))
		})


		const firstDayOfWeek = week[0]
		const lastDayOfWeek = lastThrow(week)
		const dayWidth = this._getWidthForDay()
		const weekHeight = this._getHeightForWeek()
		const eventHeight = (size.calendar_line_height + 2) // height + border
		const maxEventsPerDay = (weekHeight - dayHeight) / eventHeight
		const eventsPerDay = Math.floor(maxEventsPerDay) - 1 // preserve some space for the more events indicator
		const moreEventsForDay = [0, 0, 0, 0, 0, 0, 0]
		const eventMargin = (styles.isDesktopLayout() ? size.calendar_event_margin : size.calendar_event_margin_mobile)
		return layOutEvents(Array.from(events), (columns) => {
			return columns.map((events, columnIndex) => {
				return events.map(event => {
					if (columnIndex < eventsPerDay) {
						const position = this._getEventPosition(event, firstDayOfWeek.date, lastDayOfWeek.date, dayWidth, dayHeight, columnIndex)
						return m(".abs.overflow-hidden", {
							key: event._id[0] + event._id[1] + event.startTime.getTime(),
							style: {
								top: px(position.top),
								height: px(size.calendar_line_height),
								left: px(position.left),
								right: px(position.right)
							}
						}, this._renderEvent(attrs, event, firstDayOfWeek.date, lastDayOfWeek.date))

					} else {
						week.forEach((dayInWeek, index) => {
							const eventsForDay = attrs.eventsForDays.get(dayInWeek.date.getTime())
							if (eventsForDay && eventsForDay.indexOf(event) !== -1) {
								moreEventsForDay[index]++
							}
						})
						return null
					}
				})
			}).concat(moreEventsForDay.map((moreEventsCount, weekday) => {
				if (moreEventsCount > 0) {
					return m(".abs.darker-hover", {
						style: {
							bottom: px(3),
							height: px(size.calendar_line_height),
							left: px(weekday * dayWidth + eventMargin),
							width: px(dayWidth - 2 - eventMargin * 2)
						}
					}, m(CalendarEventBubble, {
						text: "+" + moreEventsCount,
						color: theme.content_bg.substring(1),
						onEventClicked: () => {
							attrs.onDateSelected(week[weekday].date)
						},
						hasAlarm: false,
					}))
				} else {
					return null
				}

			}))
		}, true)
	}

	_getEventPosition(event: CalendarEvent, firstDayOfWeek: Date, lastDayOfWeek: Date, calendarDayWidth: number, calendarDayHeight: number, columnIndex: number): {top: number, left: number, right: number} {
		const top = (size.calendar_line_height + 2) * columnIndex + calendarDayHeight

		const eventStart = getEventStart(event)
		const eventEnd = isAllDayEvent(event) ? getDayShifted(getEventEnd(event), -1) : event.endTime

		const dayOfStartDateInWeek = getDiffInDays(eventStart, firstDayOfWeek)
		const dayOfEndDateInWeek = getDiffInDays(eventEnd, firstDayOfWeek)

		const calendarEventMargin = styles.isDesktopLayout() ? size.calendar_event_margin : size.calendar_event_margin_mobile


		const left = (eventStartsBefore(firstDayOfWeek, event) ? 0 : dayOfStartDateInWeek * calendarDayWidth) + calendarEventMargin
		const right = (eventEndsAfterDay(lastDayOfWeek, event) ? 0 : ((6 - dayOfEndDateInWeek) * calendarDayWidth)) + calendarEventMargin
		return {
			top,
			left,
			right,
		}
	}


	_renderEvent(attrs: CalendarMonthAttrs, event: CalendarEvent, firstDayOfWeek: Date, lastDayOfWeek: Date): Children {
		let color = defaultCalendarColor
		return m(ContinuingCalendarEventBubble, {
			event: event,
			startDate: firstDayOfWeek,
			endDate: lastDayOfWeek,
			color,
			showTime: styles.isDesktopLayout(),
			onEventClicked: (e) => {
				attrs.onEventClicked(event)
			}
		})
	}


	_getHeightForWeek(): number {
		if (!this._monthDom) {
			return 1
		}
		const monthDomHeight = this._monthDom.scrollHeight
		const weeksHeight = monthDomHeight - weekDaysHeight
		return weeksHeight / 6
	}

	_getWidthForDay(): number {
		if (!this._monthDom) {
			return 1
		}
		const monthDomWidth = this._monthDom.scrollWidth
		return monthDomWidth / 7
	}
}

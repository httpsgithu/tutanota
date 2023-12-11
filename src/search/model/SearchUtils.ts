import m from "mithril"
import type { GroupInfo } from "../../api/entities/sys/TypeRefs.js"
import { WhitelabelChildTypeRef } from "../../api/entities/sys/TypeRefs.js"
import { assertNotNull, filterInt, getDayShifted, getEndOfDay, getStartOfDay, incrementMonth, isSameTypeRef } from "@tutao/tutanota-utils"
import { RouteSetFn, throttleRoute } from "../../misc/RouteChange"
import type { SearchRestriction } from "../../api/worker/search/SearchTypes"
import { assertMainOrNode } from "../../api/common/Env"
import { TranslationKey } from "../../misc/LanguageViewModel"
import { CalendarEventTypeRef, ContactTypeRef, MailTypeRef } from "../../api/entities/tutanota/TypeRefs"
import { typeModels } from "../../api/entities/tutanota/TypeModels.js"
import { locator } from "../../api/main/MainLocator.js"

assertMainOrNode()

const FIXED_FREE_SEARCH_DAYS = 28

export const SEARCH_CATEGORIES = [
	{
		name: "mail",
		typeRef: MailTypeRef,
	},
	{
		name: "contact",
		typeRef: ContactTypeRef,
	},
	{
		name: "calendar",
		typeRef: CalendarEventTypeRef,
	},
	{
		name: "whitelabelchild",
		typeRef: WhitelabelChildTypeRef,
	},
]

interface SearchMailField {
	readonly textId: TranslationKey
	readonly field: string | null
	readonly attributeIds: number[] | null
}

export const SEARCH_MAIL_FIELDS: ReadonlyArray<SearchMailField> = [
	{
		textId: "all_label",
		field: null,
		attributeIds: null,
	},
	{
		textId: "subject_label",
		field: "subject",
		attributeIds: [typeModels.Mail.values["subject"].id as number],
	},
	{
		textId: "mailBody_label",
		field: "body",
		attributeIds: [typeModels.Mail.associations["body"].id as number],
	},
	{
		textId: "from_label",
		field: "from",
		attributeIds: [typeModels.Mail.associations["sender"].id as number],
	},
	{
		textId: "to_label",
		field: "to",
		attributeIds: [
			typeModels.Mail.associations["toRecipients"].id as number,
			typeModels.Mail.associations["ccRecipients"].id as number,
			typeModels.Mail.associations["bccRecipients"].id as number,
		],
	},
	{
		textId: "attachmentName_label",
		field: "attachment",
		attributeIds: [typeModels.Mail.associations["attachments"].id as number],
	},
]

const routeSetThrottled: RouteSetFn = throttleRoute()

export function setSearchUrl(url: string) {
	if (url !== m.route.get()) {
		routeSetThrottled(url, {})
	}
}

export function searchCategoryForRestriction(restriction: SearchRestriction): string {
	return assertNotNull(SEARCH_CATEGORIES.find((c) => isSameTypeRef(c.typeRef, restriction.type))).name
}

export function getSearchUrl(
	query: string | null,
	restriction: SearchRestriction,
	selectedId?: Id,
): {
	path: string
	params: Record<string, string | number | Array<string>>
} {
	const category = searchCategoryForRestriction(restriction)
	const params: Record<string, string | number | Array<string>> = {
		query: query ?? "",
		category,
	}
	// a bit annoying but avoids putting unnecessary things into the url (if we woudl put undefined into it)
	if (restriction.start) {
		params.start = restriction.start
	}
	if (restriction.end) {
		params.end = restriction.end
	}
	if (restriction.listIds.length > 0) {
		params.list = restriction.listIds
	}
	if (restriction.field) {
		params.field = restriction.field
	}
	if (restriction.eventSeries != null) {
		params.eventSeries = String(restriction.eventSeries)
	}
	return {
		path: "/search/:category" + (selectedId ? "/" + selectedId : ""),
		params: params,
	}
}

export function getFreeSearchStartDate(): Date {
	return getStartOfDay(getDayShifted(new Date(), -FIXED_FREE_SEARCH_DAYS))
}

/**
 * Adjusts the restriction according to the account type if necessary
 */
export function createRestriction(
	searchCategory: string,
	start: number | null,
	end: number | null,
	field: string | null,
	listIds: Array<string>,
	eventSeries: boolean | null,
): SearchRestriction {
	if (locator.logins.getUserController().isFreeAccount() && searchCategory === "mail") {
		start = null
		end = getFreeSearchStartDate().getTime()
		field = null
		listIds = []
		eventSeries = null
	}

	let r: SearchRestriction = {
		type: assertNotNull(SEARCH_CATEGORIES.find((c) => c.name === searchCategory)).typeRef,
		start: start,
		end: end,
		field: null,
		attributeIds: null,
		listIds,
		eventSeries,
	}

	if (!field) {
		return r
	}

	if (searchCategory === "mail") {
		let fieldData = SEARCH_MAIL_FIELDS.find((f) => f.field === field)

		if (fieldData) {
			r.field = field
			r.attributeIds = fieldData.attributeIds
		}
	} else if (searchCategory === "calendar") {
		// nothing to do, the calendar restriction was completely set up already.
	} else if (searchCategory === "contact") {
		if (field === "recipient") {
			r.field = field
			r.attributeIds = [
				typeModels.Contact.values["firstName"].id,
				typeModels.Contact.values["lastName"].id,
				typeModels.Contact.associations["mailAddresses"].id,
			]
		} else if (field === "mailAddress") {
			r.field = field
			r.attributeIds = [typeModels.Contact.associations["mailAddresses"].id]
		}
	}

	return r
}

/**
 * Adjusts the restriction according to the account type if necessary
 */
export function getRestriction(route: string): SearchRestriction {
	let category: string
	let start: number | null = null
	let end: number | null = null
	let field: string | null = null
	let listIds: Array<string> = []
	let eventSeries: boolean | null = null

	if (route.startsWith("/mail") || route.startsWith("/search/mail")) {
		category = "mail"

		if (route.startsWith("/search/mail")) {
			try {
				// mithril will parse boolean but not numbers
				const { params } = m.parsePathname(route)
				if (typeof params["start"] === "string") {
					start = filterInt(params["start"])
				}

				if (typeof params["end"] === "string") {
					end = filterInt(params["end"])
				}

				if (typeof params["field"] === "string") {
					const fieldString = params["field"]
					field = SEARCH_MAIL_FIELDS.find((f) => f.field === fieldString)?.field ?? null
				}

				if (Array.isArray(params["list"])) {
					listIds = params["list"]
				}
			} catch (e) {
				console.log("invalid query: " + route, e)
			}
		}
	} else if (route.startsWith("/contact") || route.startsWith("/search/contact")) {
		category = "contact"
	} else if (route.startsWith("/calendar") || route.startsWith("/search/calendar")) {
		const { params } = m.parsePathname(route)

		try {
			if (typeof params["eventSeries"] === "boolean") {
				eventSeries = params["eventSeries"]
			}

			if (typeof params["start"] === "string") {
				start = filterInt(params["start"])
			}

			if (typeof params["end"] === "string") {
				end = filterInt(params["end"])
			}

			const list = params["list"]
			if (Array.isArray(list)) {
				listIds = list
			}
		} catch (e) {
			console.log("invalid query: " + route, e)
		}

		category = "calendar"
		if (start == null) {
			const now = new Date()
			now.setDate(1)
			start = getStartOfDay(now).getTime()
		}

		if (end == null) {
			const endDate = incrementMonth(new Date(start), 3)
			endDate.setDate(0)
			end = getEndOfDay(endDate).getTime()
		}
	} else if (route.startsWith("/settings/whitelabelaccounts")) {
		category = "whitelabelchild"
	} else {
		throw new Error("invalid type " + route)
	}

	return createRestriction(category, start, end, field, listIds, eventSeries)
}

export function isAdministratedGroup(localAdminGroupIds: Id[], gi: GroupInfo): boolean {
	if (gi.localAdmin && localAdminGroupIds.indexOf(gi.localAdmin) !== -1) {
		return true // group is administrated by local admin group of this user
	} else if (localAdminGroupIds.indexOf(gi.group) !== -1) {
		return true // group is one of the local admin groups of this user
	} else {
		return false
	}
}

import m, { Component, Vnode } from "mithril"
import { DropDownSelector, DropDownSelectorAttrs } from "../../common/gui/base/DropDownSelector.js"
import { lang } from "../../common/misc/LanguageViewModel.js"
import { ExtendedNotificationMode } from "../../common/native/common/generatedipc/ExtendedNotificationMode.js"
import { isDesktop } from "../../common/api/common/Env.js"

export interface NotificationContentSelectorAttrs {
	extendedNotificationMode: ExtendedNotificationMode
	onChange: (value: ExtendedNotificationMode) => void
}

export class NotificationContentSelector implements Component<NotificationContentSelectorAttrs> {
	view(vnode: Vnode<NotificationContentSelectorAttrs>) {
		return m(DropDownSelector, {
			label: "notificationContent_label",
			// Subject is not available on desktop at the moment.
			items: isDesktop()
				? [
						{
							name: lang.get("notificationPreferenceNoSenderOrSubject_action"),
							value: ExtendedNotificationMode.NoSenderOrSubject,
						},
						{
							name: lang.get("notificationPreferenceOnlySender_action"),
							value: ExtendedNotificationMode.OnlySender,
						},
				  ]
				: [
						{
							name: lang.get("notificationPreferenceNoSenderOrSubject_action"),
							value: ExtendedNotificationMode.NoSenderOrSubject,
						},
						{
							name: lang.get("notificationPreferenceOnlySender_action"),
							value: ExtendedNotificationMode.OnlySender,
						},
						{
							name: lang.get("notificationPreferenceSenderAndSubject_action"),
							value: ExtendedNotificationMode.SenderAndSubject,
						},
				  ],
			selectedValue: vnode.attrs.extendedNotificationMode,
			selectionChangedHandler: vnode.attrs.onChange,
			dropdownWidth: 250,
		} satisfies DropDownSelectorAttrs<ExtendedNotificationMode>)
	}
}

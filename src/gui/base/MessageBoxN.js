// @flow
import m from "mithril"
import {assertMainOrNode} from "../../api/common/Env"
import {theme} from "../theme"

assertMainOrNode()

export type MessageBoxAttrs = {|
	style?: {[string]: any}
|}

/**
 * A message box displaying a text. A message box can be displayed on the background of a column if the column is empty.
 */
export class MessageBoxN implements MComponent<MessageBoxAttrs> {
	view({attrs, children}: Vnode<MessageBoxAttrs>): Children {
		return m(".justify-center.items-start.dialog-width-s.pt.pb.plr.border-radius", {
			style: Object.assign(({
				'white-space': 'pre-wrap',
				'text-align': 'center',
				border: `2px solid ${theme.content_border}`,
			}), attrs.style)
		}, children)
	}
}

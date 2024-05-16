/* generated file, don't edit. */

import { MobilePaymentsFacade } from "./MobilePaymentsFacade.js"

interface NativeInterface {
	invokeNative(requestType: string, args: unknown[]): Promise<any>
}
export class MobilePaymentsFacadeSendDispatcher implements MobilePaymentsFacade {
	constructor(private readonly transport: NativeInterface) {}
	async requestSubscriptionToPlan(...args: Parameters<MobilePaymentsFacade["requestSubscriptionToPlan"]>) {
		return this.transport.invokeNative("ipc", ["MobilePaymentsFacade", "requestSubscriptionToPlan", ...args])
	}
	async getPlanPrices(...args: Parameters<MobilePaymentsFacade["getPlanPrices"]>) {
		return this.transport.invokeNative("ipc", ["MobilePaymentsFacade", "getPlanPrices", ...args])
	}
	async showSubscriptionConfigView(...args: Parameters<MobilePaymentsFacade["showSubscriptionConfigView"]>) {
		return this.transport.invokeNative("ipc", ["MobilePaymentsFacade", "showSubscriptionConfigView", ...args])
	}
	async hasOngoingAppStoreSubsciption(...args: Parameters<MobilePaymentsFacade["hasOngoingAppStoreSubsciption"]>) {
		return this.transport.invokeNative("ipc", ["MobilePaymentsFacade", "hasOngoingAppStoreSubsciption", ...args])
	}
}

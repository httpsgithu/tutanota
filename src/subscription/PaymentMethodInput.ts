import m, { Children, Vnode } from "mithril"
import type { TranslationKey } from "../misc/LanguageViewModel"
import { lang } from "../misc/LanguageViewModel"
import type { Country } from "../api/common/CountryList"
import { CountryType } from "../api/common/CountryList"
import type { PaymentData } from "../api/common/TutanotaConstants"
import { PaymentMethodType } from "../api/common/TutanotaConstants"
import { CreditCardAttrs, CreditCardInput } from "./CreditCardInput"
import { PayPalLogo } from "../gui/base/icons/Icons"
import { LazyLoaded, noOp, promiseMap } from "@tutao/tutanota-utils"
import { showProgressDialog } from "../gui/dialogs/ProgressDialog"
import type { AccountingInfo } from "../api/entities/sys/TypeRefs.js"
import { AccountingInfoTypeRef } from "../api/entities/sys/TypeRefs.js"
import { locator } from "../api/main/MainLocator"
import type { EntityEventsListener } from "../api/main/EventController"
import { isUpdateForTypeRef } from "../api/main/EventController"
import { MessageBox } from "../gui/base/MessageBox.js"
import { px } from "../gui/size"
import { isValidCreditCardNumber } from "../misc/FormatValidator"
import Stream from "mithril/stream"
import { UsageTest } from "@tutao/tutanota-usagetests"
import { SelectedSubscriptionOptions } from "./FeatureListProvider"

/**
 * Component to display the input fields for a payment method. The selector to switch between payment methods is not included.
 */
export class PaymentMethodInput {
	_creditCardAttrs: CreditCardAttrs
	_payPalAttrs: PaypalAttrs
	_selectedCountry: Stream<Country | null>
	_selectedPaymentMethod: PaymentMethodType
	_subscriptionOptions: SelectedSubscriptionOptions
	_accountingInfo: AccountingInfo
	_entityEventListener: EntityEventsListener
	private __paymentPaypalTest?: UsageTest
	private __paymentCreditTest?: UsageTest

	constructor(
		subscriptionOptions: SelectedSubscriptionOptions,
		selectedCountry: Stream<Country | null>,
		accountingInfo: AccountingInfo,
		payPalRequestUrl: LazyLoaded<string>,
	) {
		this._selectedCountry = selectedCountry
		this._subscriptionOptions = subscriptionOptions
		this._creditCardAttrs = new CreditCardAttrs()
		this._accountingInfo = accountingInfo
		this._payPalAttrs = {
			payPalRequestUrl,
			accountingInfo: this._accountingInfo,
		}
		this.__paymentPaypalTest = locator.usageTestController.getTest("payment.paypal")
		this.__paymentCreditTest = locator.usageTestController.getTest("payment.credit")

		this._entityEventListener = (updates) => {
			return promiseMap(updates, (update) => {
				if (isUpdateForTypeRef(AccountingInfoTypeRef, update)) {
					return locator.entityClient.load(AccountingInfoTypeRef, update.instanceId).then((accountingInfo) => {
						this.__paymentPaypalTest?.getStage(2).complete()
						this._accountingInfo = accountingInfo
						this._payPalAttrs.accountingInfo = accountingInfo
						m.redraw()
					})
				}
			}).then(noOp)
		}

		this._selectedPaymentMethod = PaymentMethodType.CreditCard
	}

	oncreate() {
		locator.eventController.addEntityListener(this._entityEventListener)
	}

	onremove() {
		locator.eventController.removeEntityListener(this._entityEventListener)
	}

	view(): Children {
		if (this._selectedPaymentMethod === PaymentMethodType.Invoice) {
			return m(
				".flex-center",
				m(
					MessageBox,
					{
						style: {
							marginTop: px(16),
						},
					},
					this.isOnAccountAllowed()
						? lang.get("paymentMethodOnAccount_msg") + " " + lang.get("paymentProcessingTime_msg")
						: lang.get("paymentMethodNotAvailable_msg"),
				),
			)
		} else if (this._selectedPaymentMethod === PaymentMethodType.AccountBalance) {
			return m(
				".flex-center",
				m(
					MessageBox,
					{
						style: {
							marginTop: px(16),
						},
					},
					lang.get("paymentMethodAccountBalance_msg"),
				),
			)
		} else if (this._selectedPaymentMethod === PaymentMethodType.Paypal) {
			return m(PaypalInput, this._payPalAttrs)
		} else {
			return m(CreditCardInput, this._creditCardAttrs)
		}
	}

	isOnAccountAllowed(): boolean {
		const country = this._selectedCountry()

		if (!country) {
			return false
		} else if (this._accountingInfo.paymentMethod === PaymentMethodType.Invoice) {
			return true
		} else if (this._subscriptionOptions.businessUse() && country.t !== CountryType.OTHER) {
			return true
		} else {
			return false
		}
	}

	isPaypalAssigned(): boolean {
		return isPaypalAssigned(this._accountingInfo)
	}

	validatePaymentData(): TranslationKey | null {
		if (!this._selectedPaymentMethod) {
			return "invoicePaymentMethodInfo_msg"
		} else if (this._selectedPaymentMethod === PaymentMethodType.Invoice) {
			if (!this.isOnAccountAllowed()) {
				return "paymentMethodNotAvailable_msg"
			} else {
				return null
			}
		} else if (this._selectedPaymentMethod === PaymentMethodType.Paypal) {
			return isPaypalAssigned(this._accountingInfo) ? null : "paymentDataPayPalLogin_msg"
		} else if (this._selectedPaymentMethod === PaymentMethodType.CreditCard) {
			let cc = this._creditCardAttrs.getCreditCardData()
			const stage = this.__paymentCreditTest?.getStage(1)

			if (cc.number === "") {
				stage?.setMetric({
					name: "validationFailure",
					value: "ccNumberMissing",
				})
				stage?.complete()
				return "creditCardNumberFormat_msg"
			} else if (!isValidCreditCardNumber(cc.number)) {
				stage?.setMetric({
					name: "validationFailure",
					value: "ccNumberFormat",
				})
				stage?.complete()
				return "creditCardNumberInvalid_msg"
			} else if (cc.cardHolderName === "") {
				stage?.setMetric({
					name: "validationFailure",
					value: "ccHolderMissing",
				})
				stage?.complete()
				return "creditCardCardHolderName_msg"
			} else if (cc.cvv === "" || cc.cvv.length < 3 || cc.cvv.length > 4) {
				// CVV2 is 3- or 4-digit
				stage?.setMetric({
					name: "validationFailure",
					value: "cvvFormat",
				})
				stage?.complete()
				return "creditCardCVVFormat_label"
			} else if (
				cc.expirationMonth.length !== 2 ||
				(cc.expirationYear.length !== 4 && cc.expirationYear.length !== 2) ||
				parseInt(cc.expirationMonth) < 1 ||
				parseInt(cc.expirationMonth) > 12
			) {
				stage?.setMetric({
					name: "validationFailure",
					value: "expirationDateFormat",
				})
				stage?.complete()
				return "creditCardExprationDateInvalid_msg"
			} else {
				stage?.setMetric({
					name: "validationFailure",
					value: "none",
				})
				stage?.complete()
				return null
			}
		} else {
			return null
		}
	}

	updatePaymentMethod(value: PaymentMethodType, paymentData?: PaymentData) {
		this._selectedPaymentMethod = value

		if (value === PaymentMethodType.CreditCard) {
			if (paymentData) {
				this._creditCardAttrs.setCreditCardData(paymentData.creditCardData)
			}

			if (this.__paymentPaypalTest && this.__paymentCreditTest) {
				this.__paymentPaypalTest.active = false
				this.__paymentCreditTest.active = true
			}

			this.__paymentCreditTest?.getStage(0).complete()
		} else if (value === PaymentMethodType.Paypal) {
			this._payPalAttrs.payPalRequestUrl.getAsync().then(() => m.redraw())

			if (this.__paymentPaypalTest && this.__paymentCreditTest) {
				this.__paymentPaypalTest.active = true
				this.__paymentCreditTest.active = false
			}

			this.__paymentPaypalTest?.getStage(0).complete()
		}

		m.redraw()
	}

	getPaymentData(): PaymentData {
		return {
			paymentMethod: this._selectedPaymentMethod,
			creditCardData: this._selectedPaymentMethod === PaymentMethodType.CreditCard ? this._creditCardAttrs.getCreditCardData() : null,
		}
	}

	getVisiblePaymentMethods(): Array<{
		name: string
		value: PaymentMethodType
	}> {
		const availablePaymentMethods = [
			{
				name: lang.get("paymentMethodCreditCard_label"),
				value: PaymentMethodType.CreditCard,
			},
			{
				name: "PayPal",
				value: PaymentMethodType.Paypal,
			},
		]

		// show bank transfer in case of business use, even if it is not available for the selected country
		if (this._subscriptionOptions.businessUse() || this._accountingInfo.paymentMethod === PaymentMethodType.Invoice) {
			availablePaymentMethods.push({
				name: lang.get("paymentMethodOnAccount_label"),
				value: PaymentMethodType.Invoice,
			})
		}

		// show account balance only if this is the current payment method
		if (this._accountingInfo.paymentMethod === PaymentMethodType.AccountBalance) {
			availablePaymentMethods.push({
				name: lang.get("paymentMethodAccountBalance_label"),
				value: PaymentMethodType.AccountBalance,
			})
		}

		return availablePaymentMethods
	}
}

type PaypalAttrs = {
	payPalRequestUrl: LazyLoaded<string>
	accountingInfo: AccountingInfo
}

class PaypalInput {
	private __paymentPaypalTest?: UsageTest

	constructor() {
		this.__paymentPaypalTest = locator.usageTestController.getTest("payment.paypal")
	}

	view(vnode: Vnode<PaypalAttrs>): Children {
		let attrs = vnode.attrs
		return [
			m(
				".flex-center",
				{
					style: {
						"margin-top": "50px",
					},
				},
				m(
					"button.button-height.flex.items-center.plr.border.border-radius.bg-white",
					{
						title: "PayPal",
						style: {
							cursor: "pointer",
						},
						onclick: () => {
							this.__paymentPaypalTest?.getStage(1).complete()
							if (attrs.payPalRequestUrl.isLoaded()) {
								window.open(attrs.payPalRequestUrl.getLoaded())
							} else {
								showProgressDialog("payPalRedirect_msg", attrs.payPalRequestUrl.getAsync()).then((url) => window.open(url))
							}
						},
					},
					m("img[src=" + PayPalLogo + "]"),
				),
			),
			m(
				".small.pt.center",
				isPaypalAssigned(attrs.accountingInfo)
					? lang.get("paymentDataPayPalFinished_msg", {
							"{accountAddress}": attrs.accountingInfo.paymentMethodInfo,
					  })
					: lang.get("paymentDataPayPalLogin_msg"),
			),
		]
	}
}

function isPaypalAssigned(accountingInfo: AccountingInfo): boolean {
	return accountingInfo.paypalBillingAgreement != null
}

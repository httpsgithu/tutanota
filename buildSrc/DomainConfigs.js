/**
 * Domain configurations: different parameters depending on which URLs the app is running on.
 *
 * @type DomainConfigMap
 * */
export const domainConfigs = {
	"mail.tutanota.com": {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "https://app.tuta.com",
		apiUrl: "https://mail.tutanota.com",
		paymentUrl: "https://pay.tutanota.com/braintree.html",
		webauthnUrl: "https://app.tuta.com/webauthn",
		legacyWebauthnUrl: "https://mail.tutanota.com/webauthn",
		webauthnMobileUrl: "https://app.tuta.com/webauthnmobile",
		legacyWebauthnMobileUrl: "https://mail.tutanota.com/webauthnmobile",
		webauthnRpId: "tutanota.com",
		u2fAppId: "https://tutanota.com/u2f-appid.json",
		giftCardBaseUrl: "https://app.tuta.com/giftcard",
		referralBaseUrl: "https://app.tuta.com/signup",
		websiteBaseUrl: "https://tutanota.com",
	},
	"test.tutanota.com": {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "https://app.test.tuta.com",
		apiUrl: "https://test.tutanota.com",
		paymentUrl: "https://pay.test.tutanota.com/braintree.html",
		webauthnUrl: "https://app.test.tuta.com/webauthn",
		legacyWebauthnUrl: "https://test.tutanota.com/webauthn",
		webauthnMobileUrl: "https://app.test.tuta.com/webauthnmobile",
		legacyWebauthnMobileUrl: "https://test.tutanota.com/webauthnmobile",
		webauthnRpId: "tutanota.com",
		u2fAppId: "https://test.tutanota.com/u2f-appid.json",
		giftCardBaseUrl: "https://app.test.tuta.com/giftcard",
		referralBaseUrl: "https://app.test.tuta.com/signup",
		websiteBaseUrl: "https://tutanota.com",
	},
	"app.local.tutanota.com": {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "https://app.local.tuta.com:9000",
		apiUrl: "https://app.local.tutanota.com:9000",
		paymentUrl: "https://local.tutanota.com:9000/client/build/braintree.html",
		webauthnUrl: "https://app.local.tuta.com:9000/client/build/webauthn",
		legacyWebauthnUrl: "https://local.tutanota.com:9000/client/build/webauthn",
		webauthnMobileUrl: "https://app.local.tuta.com:9000/client/build/webauthnmobile",
		legacyWebauthnMobileUrl: "https://local.tutanota.com:9000/client/build/webauthnmobile",
		webauthnRpId: "tutanota.com",
		u2fAppId: "https://local.tutanota.com/u2f-appid.json",
		giftCardBaseUrl: "https://app.local.tuta.com:9000/giftcard",
		referralBaseUrl: "https://app.local.tuta.com:9000/signup",
		websiteBaseUrl: "https://local.tutanota.com:9000",
	},
	"app.tuta.com": {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "https://mail.tutanota.com",
		apiUrl: "https://app.tuta.com",
		paymentUrl: "https://pay.tutanota.com/braintree.html",
		webauthnUrl: "https://app.tuta.com/webauthn",
		legacyWebauthnUrl: "https://mail.tutanota.com/webauthn",
		webauthnMobileUrl: "https://app.tuta.com/webauthnmobile",
		legacyWebauthnMobileUrl: "https://mail.tutanota.com/webauthnmobile",
		webauthnRpId: "tuta.com",
		u2fAppId: "https://app.tuta.com/u2f-appid.json",
		giftCardBaseUrl: "https://app.tuta.com/giftcard",
		referralBaseUrl: "https://app.tuta.com/signup",
		websiteBaseUrl: "https://tuta.com",
	},
	"app.test.tuta.com": {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "https://test.tutanota.com",
		apiUrl: "https://app.test.tuta.com",
		paymentUrl: "https://pay.test.tutanota.com/braintree.html",
		webauthnUrl: "https://app.test.tuta.com/webauthn",
		legacyWebauthnUrl: "https://test.tutanota.com/webauthn",
		webauthnMobileUrl: "https://app.test.tuta.com/webauthnmobile",
		legacyWebauthnMobileUrl: "https://test.tutanota.com/webauthnmobile",
		webauthnRpId: "tuta.com",
		u2fAppId: "https://app.test.tuta.com/u2f-appid.json",
		giftCardBaseUrl: "https://app.test.tuta.com/giftcard",
		referralBaseUrl: "https://app.test.tuta.com/signup",
		websiteBaseUrl: "https://tuta.com",
	},
	"app.local.tuta.com": {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "https://app.local.tutanota.com:9000",
		apiUrl: "https://app.local.tuta.com:9000",
		paymentUrl: "https://app.local.tuta.com:9000/braintree.html",
		webauthnUrl: "https://app.local.tuta.com:9000/webauthn",
		legacyWebauthnUrl: "https://local.tutanota.com:9000/webauthn",
		webauthnMobileUrl: "https://app.local.tuta.com:9000/webauthnmobile",
		legacyWebauthnMobileUrl: "https://local.tutanota.com:9000/webauthnmobile",
		webauthnRpId: "tuta.com",
		u2fAppId: "https://app.local.tuta.com/u2f-appid.json",
		giftCardBaseUrl: "https://app.local.tuta.com:9000/giftcard",
		referralBaseUrl: "https://app.local.tuta.com:9000/signup",
		websiteBaseUrl: "https://local.tuta.com:9000",
	},
	localhost: {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "http://localhost:9000",
		apiUrl: "http://localhost:9000",
		paymentUrl: "http://localhost:9000/braintree.html",
		webauthnUrl: "http://localhost:9000/webauthn",
		legacyWebauthnUrl: "http://localhost:9000/webauthn",
		webauthnMobileUrl: "http://localhost:9000/webauthnmobile",
		legacyWebauthnMobileUrl: "http://localhost:9000/webauthnmobile",
		webauthnRpId: "localhost",
		u2fAppId: "http://localhost:9000/u2f-appid.json",
		giftCardBaseUrl: "http://localhost:9000/giftcard",
		referralBaseUrl: "http://localhost:9000/signup",
		websiteBaseUrl: "https://tuta.com",
	},
	"172.16.2.192": {
		firstPartyDomain: true,
		partneredDomainTransitionUrl: "http://172.16.2.192:9000",
		apiUrl: "http://172.16.2.192:9000",
		paymentUrl: "http://172.16.2.192:9000/braintree.html",
		webauthnUrl: "http://172.16.2.192:9000/webauthn",
		legacyWebauthnUrl: "http://172.16.2.192:9000/webauthn",
		webauthnMobileUrl: "http://172.16.2.192:9000/webauthnmobile",
		legacyWebauthnMobileUrl: "http://172.16.2.192:9000/webauthnmobile",
		webauthnRpId: "172.16.2.192",
		u2fAppId: "http://172.16.2.192:9000/u2f-appid.json",
		giftCardBaseUrl: "http://172.16.2.192:9000/giftcard",
		referralBaseUrl: "http://172.16.2.192:9000/signup",
		websiteBaseUrl: "https://tuta.com",
	},
	"{hostname}": {
		firstPartyDomain: false,
		partneredDomainTransitionUrl: "{protocol}//{hostname}",
		apiUrl: "{protocol}//{hostname}",
		paymentUrl: "https://pay.tutanota.com/braintree.html",
		webauthnUrl: "{protocol}//{hostname}/webauthn",
		legacyWebauthnUrl: "{protocol}//{hostname}/webauthn",
		webauthnMobileUrl: "{protocol}//{hostname}/webauthnmobile",
		legacyWebauthnMobileUrl: "{protocol}//{hostname}/webauthnmobile",
		webauthnRpId: "{hostname}",
		u2fAppId: "{protocol}//{hostname}/u2f-appid.json",
		giftCardBaseUrl: "https://app.tuta.com/giftcard",
		referralBaseUrl: "https://app.tuta.com/signup",
		websiteBaseUrl: "https://tuta.com",
	},
}

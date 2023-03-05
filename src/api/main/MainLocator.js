//@flow
import type {WorkerClient} from "./WorkerClient"
import {bootstrapWorker} from "./WorkerClient"
import {EventController} from "./EventController"
import {EntropyCollector} from "./EntropyCollector"
import {SearchModel} from "../../search/model/SearchModel"
import {MailModel} from "../../mail/model/MailModel"
import {assertMainOrNode, isBrowser} from "../common/Env"
import {notifications} from "../../gui/Notifications"
import {logins} from "./LoginController"
import type {ContactModel} from "../../contacts/model/ContactModel"
import {ContactModelImpl} from "../../contacts/model/ContactModel"
import {EntityClient} from "../common/EntityClient"
import type {CalendarModel} from "../../calendar/model/CalendarModel"
import {CalendarModelImpl} from "../../calendar/model/CalendarModel"
import type {DeferredObject} from "@tutao/tutanota-utils"
import {defer, downcast} from "@tutao/tutanota-utils"
import {ProgressTracker} from "./ProgressTracker"
import {MinimizedMailEditorViewModel} from "../../mail/model/MinimizedMailEditorViewModel"
import {SchedulerImpl} from "../../misc/Scheduler"
import type {ICredentialsProvider} from "../../misc/credentials/CredentialsProvider"
import {createCredentialsProvider} from "../../misc/credentials/CredentialsProviderFactory"
import type {LoginFacade} from "../worker/facades/LoginFacade"
import type {CustomerFacade} from "../worker/facades/CustomerFacade"
import type {GiftCardFacade} from "../worker/facades/GiftCardFacade"
import type {GroupManagementFacade} from "../worker/facades/GroupManagementFacade"
import type {ConfigurationDatabase} from "../worker/facades/ConfigurationDatabase"
import type {CalendarFacade} from "../worker/facades/CalendarFacade"
import type {MailFacade} from "../worker/facades/MailFacade"
import type {ShareFacade} from "../worker/facades/ShareFacade"
import type {CounterFacade} from "../worker/facades/CounterFacade"
import type {Indexer} from "../worker/search/Indexer"
import type {SearchFacade} from "../worker/search/SearchFacade"
import type {BookingFacade} from "../worker/facades/BookingFacade"
import type {MailAddressFacade} from "../worker/facades/MailAddressFacade"
import type {FileFacade} from "../worker/facades/FileFacade"
import type {UserManagementFacade} from "../worker/facades/UserManagementFacade"
import type {ContactFormFacade} from "../worker/facades/ContactFormFacade"
import type {DeviceEncryptionFacade} from "../worker/facades/DeviceEncryptionFacade"
import {FileController} from "../../file/FileController"
import type {NativeFileApp} from "../../native/common/FileApp"
import type {NativePushServiceApp} from "../../native/main/NativePushServiceApp"
import type {NativeSystemApp} from "../../native/main/NativeSystemApp"
import type {NativeInterfaceMain} from "../../native/main/NativeInterfaceMain"
import {createNativeInterfaces} from "./NativeInterfaceFactory"
import {ProgrammingError} from "../common/error/ProgrammingError"
import type {NativeInterfaces} from "./NativeInterfaceFactory"
import {SecondFactorHandler} from "../../misc/2fa/SecondFactorHandler"
import {WebauthnClient} from "../../misc/2fa/webauthn/WebauthnClient"

assertMainOrNode()

// We use interface here mostly to make things readonly from the outside.
export interface IMainLocator {
	+eventController: EventController;
	+search: SearchModel;
	+mailModel: MailModel;
	+calendarModel: CalendarModel;
	+minimizedMailModel: MinimizedMailEditorViewModel;
	+contactModel: ContactModel;
	+entityClient: EntityClient;
	+progressTracker: ProgressTracker;
	+credentialsProvider: ICredentialsProvider;
	+worker: WorkerClient;
	+native: NativeInterfaceMain;
	+fileController: FileController;
	+fileApp: NativeFileApp;
	+pushService: NativePushServiceApp;
	+systemApp: NativeSystemApp;
	+secondFactorHandler: SecondFactorHandler;

	+loginFacade: LoginFacade;
	+customerFacade: CustomerFacade;
	+giftCardFacade: GiftCardFacade;
	+groupManagementFacade: GroupManagementFacade;
	+configFacade: ConfigurationDatabase;
	+calendarFacade: CalendarFacade;
	+mailFacade: MailFacade;
	+shareFacade: ShareFacade;
	+counterFacade: CounterFacade;
	+indexerFacade: Indexer;
	+searchFacade: SearchFacade;
	+bookingFacade: BookingFacade;
	+mailAddressFacade: MailAddressFacade;
	+fileFacade: FileFacade;
	+userManagementFacade: UserManagementFacade;
	+contactFormFacade: ContactFormFacade;
	+deviceEncryptionFacade: DeviceEncryptionFacade;

	+init: () => Promise<void>;
	+initialized: Promise<void>;
}


class MainLocator implements IMainLocator {
	eventController: EventController;
	search: SearchModel;
	mailModel: MailModel;
	calendarModel: CalendarModel;
	minimizedMailModel: MinimizedMailEditorViewModel;
	contactModel: ContactModel;
	entityClient: EntityClient;
	progressTracker: ProgressTracker;
	credentialsProvider: ICredentialsProvider;
	worker: WorkerClient;
	fileController: FileController;
	secondFactorHandler: SecondFactorHandler;

	loginFacade: LoginFacade;
	customerFacade: CustomerFacade;
	giftCardFacade: GiftCardFacade;
	groupManagementFacade: GroupManagementFacade;
	configFacade: ConfigurationDatabase;
	calendarFacade: CalendarFacade;
	mailFacade: MailFacade;
	shareFacade: ShareFacade;
	counterFacade: CounterFacade;
	indexerFacade: Indexer;
	searchFacade: SearchFacade;
	bookingFacade: BookingFacade;
	mailAddressFacade: MailAddressFacade;
	fileFacade: FileFacade;
	userManagementFacade: UserManagementFacade;
	contactFormFacade: ContactFormFacade;
	deviceEncryptionFacade: DeviceEncryptionFacade;

	_nativeInterfaces: ?NativeInterfaces = null

	get native(): NativeInterfaceMain {
		return this._getNativeInterface("native")
	}

	get fileApp(): NativeFileApp {
		return this._getNativeInterface("fileApp")
	}

	get pushService(): NativePushServiceApp {
		return this._getNativeInterface("pushService")
	}

	get systemApp(): NativeSystemApp {
		return this._getNativeInterface("systemApp")
	}

	// get an interface from native interfaces
	// return type is `any` because of flow nonsense
	_getNativeInterface(name: $Keys<NativeInterfaces>): any {
		if (!this._nativeInterfaces) {
			throw new ProgrammingError(`Tried to use ${name} in web`)
		}
		return this._nativeInterfaces[name]
	}

	+_workerDeferred: DeferredObject<WorkerClient>
	_entropyCollector: EntropyCollector

	_deferredInitialized: DeferredObject<void> = defer()

	get initialized(): Promise<void> {
		return this._deferredInitialized.promise
	}

	constructor() {
		this._workerDeferred = defer()
	}

	async init(): Promise<void> {
		// Split init in two separate parts: creating modules and causing side effects.
		// We would like to do both on normal init but on HMR we just want to replace modules without a new worker. If we create a new
		// worker we end up losing state on the worker side (including our session).
		this.worker = bootstrapWorker(this)

		await this._createInstances()

		this._entropyCollector = new EntropyCollector(this.worker)
		this._entropyCollector.start()

		this._deferredInitialized.resolve()
	}

	async _createInstances() {

		if (!isBrowser()) {
			this._nativeInterfaces = await createNativeInterfaces()
		}

		const {
			loginFacade,
			customerFacade,
			giftCardFacade,
			groupManagementFacade,
			configFacade,
			calendarFacade,
			mailFacade,
			shareFacade,
			counterFacade,
			indexerFacade,
			searchFacade,
			bookingFacade,
			mailAddressFacade,
			fileFacade,
			userManagementFacade,
			contactFormFacade,
			deviceEncryptionFacade,
			restInterface
		} = this.worker.getWorkerInterface()

		this.loginFacade = loginFacade
		this.customerFacade = customerFacade
		this.giftCardFacade = giftCardFacade
		this.groupManagementFacade = groupManagementFacade
		this.configFacade = configFacade
		this.calendarFacade = calendarFacade
		this.mailFacade = mailFacade
		this.shareFacade = shareFacade
		this.counterFacade = counterFacade
		this.indexerFacade = indexerFacade
		this.searchFacade = searchFacade
		this.bookingFacade = bookingFacade
		this.mailAddressFacade = mailAddressFacade
		this.fileFacade = fileFacade
		this.userManagementFacade = userManagementFacade
		this.contactFormFacade = contactFormFacade
		this.deviceEncryptionFacade = deviceEncryptionFacade

		this.eventController = new EventController(logins)
		this.progressTracker = new ProgressTracker()
		this.search = new SearchModel(this.searchFacade)
		this.entityClient = new EntityClient(restInterface)
		this.secondFactorHandler = new SecondFactorHandler(this.eventController, this.entityClient, new WebauthnClient(), this.loginFacade)
		this.credentialsProvider = await createCredentialsProvider(deviceEncryptionFacade, this._nativeInterfaces?.native)

		this.mailModel = new MailModel(notifications, this.eventController, this.worker, this.mailFacade, this.entityClient)
		const lazyScheduler = async () => {
			const {AlarmSchedulerImpl} = await import("../../calendar/date/AlarmScheduler")
			const {DateProviderImpl} = await import("../../calendar/date/CalendarUtils")
			const dateProvider = new DateProviderImpl()
			return new AlarmSchedulerImpl(dateProvider, new SchedulerImpl(dateProvider, window))
		}
		this.calendarModel = new CalendarModelImpl(
			notifications,
			lazyScheduler,
			this.eventController,
			this.worker,
			logins,
			this.progressTracker,
			this.entityClient,
			this.mailModel,
			this.calendarFacade,
			this.fileFacade,
		)
		this.contactModel = new ContactModelImpl(this.searchFacade, this.entityClient, logins)
		this.minimizedMailModel = new MinimizedMailEditorViewModel()
		this.fileController = new FileController(this._nativeInterfaces?.fileApp)
	}
}

export const locator: IMainLocator = new MainLocator()

if (typeof window !== "undefined") {
	window.tutao.locator = locator
}

// It is critical to accept new locator here because locator is used in a lot of places and calculating all the dependencies is very
// slow during HMR.
// HMR is not meant for changing models so if there is a big change then you are better off reloading but this will work with simple
// method implementation swapping.
const hot = typeof module !== "undefined" && module.hot
if (hot) {
	hot.accept(async () => {
		// This should be there already
		await locator.initialized
		const worker = locator.worker

		// Import this module again and init the locator. If someone just imports it they will get a new one
		const newLocator = require(module.id).locator
		newLocator.worker = worker
		await newLocator._createInstances(worker)

		// This will patch old instances to use new classes, this is when instances are already injected
		for (const key of Object.getOwnPropertyNames(newLocator)) {
			Object.setPrototypeOf(downcast(locator)[key], Object.getPrototypeOf(newLocator[key]))
		}
	})
}
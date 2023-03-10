/**
 * This is a little wrapper around electron-updater to decouple logic.
 */
import { downcast, noOp } from "@tutao/tutanota-utils"
import path from "path"
import fs from "fs"
import { app } from "electron"
import { AppUpdater } from "electron-updater"

export interface UpdaterWrapper {
	updatesEnabledInBuild(): boolean

	electronUpdater: Promise<AppUpdater>
}

export class UpdaterWrapperImpl implements UpdaterWrapper {
	updatesEnabledInBuild(): boolean {
		try {
			const basepath = process.platform === "darwin" ? path.join(path.dirname(app.getPath("exe")), "..") : path.dirname(app.getPath("exe"))
			const appUpdateYmlPath = path.join(basepath, "resources", "app-update.yml")
			fs.accessSync(appUpdateYmlPath, fs.constants.R_OK)
			return true
		} catch (e) {
			return false
		}
	}

	electronUpdater: Promise<AppUpdater> = env.dist
		? import("electron-updater").then((m) => m.autoUpdater)
		: Promise.resolve(downcast<AppUpdater>(fakeAutoUpdater))
}

const fakeAutoUpdater = new (class {
	on(): this {
		return this
	}

	once(): this {
		return this
	}

	removeListener(): this {
		return this
	}

	downloadUpdate() {
		return Promise.resolve([])
	}

	quitAndInstall() {}

	checkForUpdates() {
		// Never resolved, return type is too complex
		return new Promise(noOp)
	}
})()
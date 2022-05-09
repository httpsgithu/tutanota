import * as env from "../buildSrc/env.js"
import fs from "fs-extra"
import path from "path"
import {renderHtml} from "../buildSrc/LaunchHtml.js"
import {runStep} from "../buildSrc/runStep.js"
import {$} from "zx"
import {build} from "esbuild"
import {libDeps, preludeEnvPlugin} from "../buildSrc/DevBuild.js"
import {keytarNativePlugin, sqliteNativePlugin} from "../buildSrc/nativeLibraryEsbuildPlugin.js"
import {getTutanotaAppVersion} from "../buildSrc/buildUtils.js"
import {esbuildPluginAliasPath} from "esbuild-plugin-alias-path"

export async function runTestBuild({clean}) {
	if (clean) {
		await runStep("Clean", async () => {
			await fs.emptyDir("build")
		})
	}

	await runStep("Packages", async () => {
		await $`npm run build-packages`
	})

	await runStep("Types", async () => {
		await $`npx tsc --incremental true --noEmit true`
	})

	const version = getTutanotaAppVersion()
	const localEnv = env.create({staticUrl: "http://localhost:9000", version, mode: "Test", dist: false})

	await runStep("Assets", async () => {
		const pjPath = path.join("..", "package.json")
		await fs.mkdir(inBuildDir(), {recursive: true})
		await fs.copyFile(pjPath, inBuildDir("package.json"))
		await createUnitTestHtml("api", localEnv)
		await createUnitTestHtml("client", localEnv)
	})

	await runStep("Esbuild", async () => {
		await build({
			entryPoints: ["api/bootstrapTests-api.ts", "client/bootstrapTests-client.ts"],
			outdir: "./build",
			// Bundle to include the whole graph
			bundle: true,
			// Split so that dynamically included node-only tests are not embedded/run in the browser
			splitting: true,
			format: "esm",
			sourcemap: "linked",
			define: {
				// See Env.ts for explanation
				"NO_THREAD_ASSERTIONS": 'true',
			},
			external: [
				"electron",
				// esbuild can't deal with node imports in ESM output at the moment
				// see https://github.com/evanw/esbuild/pull/2067
				"xhr2",
				"better-sqlite3",
				"express",
				"server-destroy",
				"body-parser",
			],
			// even though tests might be running in browser we set it to node so that it ignores all builtins
			platform: "node",
			plugins: [
				preludeEnvPlugin(localEnv),
				libDeps(".."),
				esbuildPluginAliasPath({
					alias: {
						// Take browser testdouble without funny require() magic
						"testdouble": path.resolve("../node_modules/testdouble/dist/testdouble.js"),
					}
				}),
				sqliteNativePlugin({
					environment: "node",
					dstPath: "./build/better_sqlite3.node",
					platform: process.platform,
					// Since we don't bundle it we need to give a path relative to database.js in node_modules/better_sqlite3
					nativeBindingPath: "../build/Release/better_sqlite3.node",
				}),
				keytarNativePlugin({
					environment: "node",
					dstPath: "./build/keytar.node",
					platform: process.platform,
				}),
			]
		})
	})
}

async function createUnitTestHtml(project, localEnv) {
	const imports = [{src: `test-${project}.js`, type: "module"}]

	const template = `import('./${project}/bootstrapTests-${project}.js')`
	const targetFile = inBuildDir(`test-${project}.html`)
	console.log(`Generating browser tests for ${project} at "${targetFile}"`)
	await _writeFile(inBuildDir(`test-${project}.js`), [
		`window.whitelabelCustomizations = null`,
	].join("\n") + "\n" + template)

	const html = await renderHtml(imports, localEnv)
	await _writeFile(targetFile, html)
}

function _writeFile(targetFile, content) {
	return fs.mkdir(path.dirname(targetFile), {recursive: true}).then(() => fs.writeFile(targetFile, content, 'utf-8'))
}

function inBuildDir(...files) {
	return path.join("build", ...files)
}
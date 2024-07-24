pipeline {
	environment {
		VERSION = sh(returnStdout: true, script: "${env.NODE_PATH}/node -p -e \"require('./package.json').version\" | tr -d \"\n\"")
		APK_SIGN_STORE = '/opt/android-keystore/android.jks'
		PATH = "${env.NODE_PATH}:${env.PATH}:/home/jenkins/emsdk/upstream/bin/:/home/jenkins/emsdk/:/home/jenkins/emsdk/upstream/emscripten"
		ANDROID_SDK_ROOT = "/opt/android-sdk-linux"
		ANDROID_HOME = "/opt/android-sdk-linux"
	}

	agent {
		label 'linux'
	}

	tools {
		jdk 'jdk-21.0.2'
	}

	parameters {
		booleanParam(
			name: 'RELEASE', defaultValue: false,
			description: "Build a test and release version of the app. Uploads both to Nexus."
		)
	}

	stages {
    	stage('Check Github') {
			steps {
				script {
					def util = load "ci/jenkins-lib/util.groovy"
					util.checkGithub()
				}
			}
    	}
		stage('Run Tests') {
			steps {
				dir("${WORKSPACE}/app-android/") {
					sh "./gradlew test"
				}
			}
		}
		stage('Build') {
			stages {
				stage('Testing') {
					environment {
						APK_SIGN_ALIAS = "test.tutao.de"
					}
					agent {
						label 'linux'
					}
					steps {
						sh 'npm ci'
						sh 'npm run build-packages'
						script {
							def util = load "ci/jenkins-lib/util.groovy"
							util.downloadFromNexus(	groupId: "lib",
													artifactId: "android-database-sqlcipher",
													version: "4.5.0",
													outFile: "${WORKSPACE}/app-android/libs/android-database-sqlcipher-4.5.0.aar",
													fileExtension: 'aar')
						}
						withCredentials([
								string(credentialsId: 'apk-sign-store-pass', variable: "APK_SIGN_STORE_PASS"),
								string(credentialsId: 'apk-sign-key-pass', variable: "APK_SIGN_KEY_PASS")
						]) {
							sh 'node android.js -b releaseTest test -a calendar'
						}
						stash includes: "build/app-android/calendar-tutao-releaseTest-${VERSION}.apk", name: 'apk-testing'
					}
				} // stage testing
				stage('Production') {
					when {
						expression { params.RELEASE }
					}
					environment {
						APK_SIGN_ALIAS = "tutao.de"
					}
					steps {
						echo "Building ${VERSION}"
						sh 'npm ci'
						sh 'npm run build-packages'
						script {
							def util = load "ci/jenkins-lib/util.groovy"
							util.downloadFromNexus(	groupId: "lib",
													artifactId: "android-database-sqlcipher",
													version: "4.5.0",
													outFile: "${WORKSPACE}/app-android/libs/android-database-sqlcipher-4.5.0.aar",
													fileExtension: 'aar')
						}
						withCredentials([
								string(credentialsId: 'apk-sign-store-pass', variable: "APK_SIGN_STORE_PASS"),
								string(credentialsId: 'apk-sign-key-pass', variable: "APK_SIGN_KEY_PASS")
						]) {
							sh 'node android.js -b release prod -a calendar'
						}
						stash includes: "build/app-android/calendar-tutao-release-${VERSION}.apk", name: 'apk-production'
					}
				} // stage production
			}
		}

		stage('Publish') {
			when {
				expression { params.RELEASE }
			}
			stages {
				stage('Testing') {
					steps {
						script {
							def util = load "ci/jenkins-lib/util.groovy"
							unstash 'apk-testing'

							util.publishToNexus(
									groupId: "app",
									artifactId: "calendar-android-test",
									version: "${VERSION}",
									assetFilePath: "${WORKSPACE}/build/app-android/calendar-tutao-releaseTest-${VERSION}.apk",
									fileExtension: 'apk'
							)
						}
					}
				} // stage testing
				stage('Production') {
					steps {
						sh 'npm ci'
						unstash 'apk-production'

						script {
							def filePath = "build/app-android/calendar-tutao-release-${VERSION}.apk"
							def util = load "ci/jenkins-lib/util.groovy"

							util.publishToNexus(
									groupId: "app",
									artifactId: "calendar-android",
									version: "${VERSION}",
									assetFilePath: "${WORKSPACE}/${filePath}",
									fileExtension: 'apk'
							)
						}
					}
				} // stage production
			}
		}
	}
}
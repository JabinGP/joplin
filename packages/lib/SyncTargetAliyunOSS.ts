import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
// import { FileApi } from './file-api';

interface FileApiOptions {
	path(): string;
	username(): string;
	password(): string;
	directory(): string;
}

export default class SyncTargetAliyunOSS extends BaseSyncTarget {

	public static id() {
		// Find this number
		return 999;
	}

	public static supportsConfigCheck() {
		return true;
	}

	public static targeName() {
		return 'aliyun_OSS';
	}

	public static label() {
		return `${_('Aliyun OSS')} (Beta)`;
	}

	public async isAuthenticated() {
		return true;
	}

	// public async fileApi(): Promise<FileApi> {
	//	return super.fileApi();
	// }

	// private static async newFileApi_(options: FileApiOptions) {
	// 	return options;
	// }

	public static async checkConfig(options: FileApiOptions) {
		const output = {
			ok: false,
			errorMessage: '',
		};

		try {
			console.log(options);
		} catch (error) {
			output.errorMessage = error.message;
			if (error.code) output.errorMessage += ` (Code ${error.code})`;
		}

		return options;
	}

	protected async initFileApi() {
		return 9999;
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

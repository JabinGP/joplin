import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import FileApiDriverAliyunOSS from './file-api-driver-aliyun-oss';
import OSS = require('ali-oss');
// import { FileApi } from './file-api';

const region = 'oss-cn-shenzhen';
const accKeyId = 'LTAI5t6P4eAsGJ3Cmc2y4USv';
const accKeySecret = 'QksBjoxhGo16PJfP4GjCskryIsD6LP';
const bucket = 'jabin-dev-oss';

interface FileApiOptions {
	path(): string;
	username(): string;
	password(): string;
	directory(): string;
}

export default class SyncTargetAliyunOSS extends BaseSyncTarget {
	private api_: OSS;

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

	public ossParameters() {
		return {
			region: region,
			accessKeyId: accKeyId,
			accessKeySecret: accKeySecret,
			bucket: bucket,
		};
	}

	public api(): OSS {
		if (this.api_) return this.api_;

		this.api_ = new OSS(this.ossParameters());
		return this.api_;
	}

	public async isAuthenticated() {
		return true;
	}

	// public async fileApi(): Promise<FileApi> {
	//	return super.fileApi();
	// }

	private static async newFileApi_(options: FileApiOptions) {
		return options;
	}

	public static async checkConfig(options: FileApiOptions) {
		console.log(options);
		const output = {
			ok: false,
			errorMessage: '',
		};

		// try {
		const params = {
			region: region,
			accessKeyId: accKeyId,
			accessKeySecret: accKeySecret,
			bucket: bucket,
		};

		const driver = new FileApiDriverAliyunOSS(new OSS(params));
		const fileApi = new FileApi('', driver);
		fileApi.setSyncTargetId(this.id());

		const api = fileApi.driver().api() as OSS;
		await api.getBucketInfo(params.bucket);
		output.ok = true;
		// } catch (error) {
		// 	output.errorMessage = error.message;
		// 	if (error.code) output.errorMessage += ` (Code ${error.code})`;
		// }

		return output;
	}

	protected async initFileApi() {
		const appDir = '';
		const fileApi = new FileApi(appDir, new FileApiDriverAliyunOSS(this.api()));
		fileApi.setSyncTargetId(SyncTargetAliyunOSS.id());
		return fileApi;
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}

import OSS = require('ali-oss');
const shim = require('./shim').default;
const { basename } = require('./path-utils');

interface AliyunOSSObjectStat {
	path: string;
	updated_time: number;
	isDeleted: boolean;
	isDir: boolean;
}

interface AliyunOSSMetadata {
	name: string;
	lastModified: string;
}

export default class FileApiDriverAliyunOSS {
	private api_: OSS;

	public constructor(api: OSS) {
		this.api_ = api;
	}

	public async initialize(basePath: string) {
		// Todo
		return basePath;
	}

	public api() {
		return this.api_;
	}

	public requestRepeatCount() {
		return 3;
	}

	private makepath_(path: string) {
		if (!path) return '';
		return path;
	}

	public async stat(path: string) {
		const headRes = await this.api().head(this.makepath_(path));
		const headers: any = headRes.res.headers; // types incomplete
		const meta = {
			name: path,
			lastModified: headers['last-modified'] as string,
		};
		const output = this.metadataToStat_(meta);
		console.log(output);
		return output;
	}

	private metadataToStat_(md: AliyunOSSMetadata): AliyunOSSObjectStat {
		const isDir = md.name.endsWith('/');
		const lastModifiedDate = md.lastModified ?
			new Date(md.lastModified) : new Date();

		return {
			path: isDir ? md.name : basename(md.name),
			updated_time: lastModifiedDate.getTime(),
			isDeleted: false, // not support versioned bucket yet
			isDir: isDir,
		};
	}

	private metadataToStats_(mds: Array<AliyunOSSMetadata>): Array<AliyunOSSObjectStat> {
		return mds.map(v => this.metadataToStat_(v));
	}


	public async batchDeletes(paths: string[]) {
		if (paths.length < 1) {
			return;
		}
		const res = await this.api().deleteMulti(paths);
		console.log(res);
	}

	public async move(oldPath: string, newPath: string) {
		// First step: copy
		const copyRes = await this.api().copy(newPath, oldPath);
		console.log(copyRes);
		// Second step: delete
		const delRes = await this.api().delete(oldPath);
		console.log(delRes);
	}

	public async put(path: string, content: any, options: any = null) {
		const remotePath = this.makepath_(path);
		if (!options) options = {};

		if (options.source != 'file') {
			// If need to upload string content as a file
			// Need to Change the content to buffer
			// https://help.aliyun.com/document_detail/111266.html?spm=a2c4g.11186623.6.1113.33ca686ap7cs69
			content = Buffer.from(content, 'utf8');
		}
		await this.api().put(remotePath, content);
	}

	public async delete(path: string) {
		const res = await this.api().delete(path);
		console.log(res);
	}

	public async get(path: string, options: any) {
		if (!options) options = {};
		const remotePath = this.makepath_(path);
		const responseFormat = options.responseFormat || 'text';

		const res = await this.api().get(remotePath);

		if (responseFormat === 'text') {
			return res.content.toString();
		}

		if (options.target === 'file') {
			if (!options.path) throw new Error('get: target options.path is missing');
			await shim.fsDriver().writeBinaryFile(options.path, res.content);
			const resInfo = res.res as any; // types incomplete
			return {
				ok: true,
				path: options.path,
				text: () => {
					return resInfo.statusCode;
				},
				json: () => {
					return { message: `${resInfo.statusCode}: ${resInfo.statusMessage}` };
				},
				status: resInfo.statusCode,
				headers: resInfo.headers,
			};
		}
	}

	public async list(path: string): Promise<Array<AliyunOSSObjectStat>> {
		let prefixPath = this.makepath_(path);
		if (prefixPath.length > 0 && prefixPath[prefixPath.length - 1] !== '/') {
			prefixPath += '/';
		}


		const query: OSS.ListObjectsQuery = {
			'prefix': prefixPath,
			'max-keys': 1000,
		};
		const options: OSS.RequestOptions = {
			timeout: 600, // ms
		};
		const output: Array<AliyunOSSObjectStat> = [];
		let listRes = null; // OSS.ListObjectResult

		do {
			listRes = await this.api().list(query, options);
			if (listRes.objects) {
				output.push.apply(output, this.metadataToStats_(listRes.objects));
			}
			query.marker = listRes.nextMarker;
		} while (query.marker);
		console.log(output);
		return output;
	}

	public async delta() {

	}


	public async clearRoot() {
		// First step: get all filenames
		const query: OSS.ListObjectsQuery = {
			'max-keys': 1000,
		};
		const options: OSS.RequestOptions = {
			timeout: 600, // ms
		};
		const objectMetas: Array<OSS.ObjectMeta> = [];
		let listRes = null; // OSS.ListObjectResult

		do {
			listRes = await this.api().list(query, options);
			if (listRes.objects) {
				objectMetas.push.apply(objectMetas, listRes.objects);
			}
			query.marker = listRes.nextMarker;
		} while (query.marker);
		// Second step: delete all filenames
		await this.batchDeletes(objectMetas.map(v => v.name));
	}
}

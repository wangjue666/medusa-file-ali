import { parse } from 'path';
import stream from 'stream';
import { AbstractFileService, IFileService, Logger } from '@medusajs/medusa';
import {
  FileServiceUploadResult,
  DeleteFileType,
  UploadStreamDescriptorType,
  FileServiceGetUploadStreamResult,
  GetUploadedFileType,
} from '@medusajs/types';
import AliOss from 'ali-oss';

type FileData = Parameters<AbstractFileService['upload']>[0];
export type AliOssOptions = {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  secure?: boolean;
  prefix?: string;
};

class AliSevice extends AbstractFileService implements IFileService {
  protected aliOssOptions: AliOssOptions;

  protected logger_: Logger;

  protected client_: AliOss;

  protected prefix_: string;

  constructor(
    { logger }: { logger: Logger },
    options: AliOssOptions & Record<string, unknown>,
  ) {
    super({}, options);
    this.aliOssOptions = options;
    this.logger_ = logger;
    this.client_ = this.getClient();
    this.prefix_ = options.prefix ? `${options.prefix}/` : '';
  }

  getClient() {
    const { region, accessKeyId, accessKeySecret, bucket } = this.aliOssOptions;
    return new AliOss({
      region,
      accessKeyId,
      accessKeySecret,
      bucket,
      secure:
        this.aliOssOptions.secure === undefined
          ? true
          : this.aliOssOptions.secure,
    });
  }

  async upload(fileData: FileData): Promise<FileServiceUploadResult> {
    return this.uploadFile(fileData, 'default');
  }

  uploadProtected(fileData: FileData): Promise<FileServiceUploadResult> {
    return this.uploadFile(fileData, 'private');
  }

  async uploadFile(
    fileData: FileData,
    acl: 'default' | 'private',
  ): Promise<FileServiceUploadResult> {
    const parsedFilename = parse(fileData.originalname);

    const fileKey = `${this.prefix_}${parsedFilename.name}-${Date.now()}${
      parsedFilename.ext
    }`;
    try {
      const result = await this.client_.put(fileKey, fileData.path, {
        headers: {
          'x-oss-storage-class': 'Standard',
          'x-oss-object-acl': acl,
        },
      });
      return {
        url: result.url.replace('http', 'https'),
        key: fileKey,
      };
    } catch (e) {
      this.logger_.error(e);
      throw e;
    }
  }

  async delete(fileData: DeleteFileType): Promise<void> {
    try {
      await this.client_.delete(fileData.fileKey);
    } catch (e) {
      this.logger_.error(e);
    }
  }

  async getUploadStreamDescriptor(
    fileData: UploadStreamDescriptorType,
  ): Promise<FileServiceGetUploadStreamResult> {
    const pass = new stream.PassThrough();
    const fileKey = `${this.prefix_}${fileData.name}.${fileData.ext}`;

    const result = this.client_.putStream(fileKey, pass);
    const url = this.genAliOsUrl(fileKey);
    return {
      writeStream: pass,
      promise: result,
      url,
      fileKey,
    };
  }

  async getDownloadStream(
    fileData: GetUploadedFileType,
  ): Promise<NodeJS.ReadableStream> {
    const result = await this.client_.getStream(fileData.fileKey);
    return result.stream as NodeJS.ReadableStream;
  }

  async getPresignedDownloadUrl(
    fileData: GetUploadedFileType,
  ): Promise<string> {
    return this.genAliOsUrl(fileData.fileKey);
  }

  genAliOsUrl(fileKey: string): string {
    return `https://${this.aliOssOptions.bucket}.${this.aliOssOptions.region}.aliyuncs.com/${fileKey}`;
  }
}

export default AliSevice;

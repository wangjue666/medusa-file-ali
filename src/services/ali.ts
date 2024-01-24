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
  storageType?: 'flat' | 'byDate';
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
    options.storageType = options.storageType || 'flat';
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

    const fileKey = this.genFileKey({
      name: parsedFilename.name,
      ext: parsedFilename.ext,
    });
    try {
      const result = await this.client_.put(fileKey, fileData.path, {
        headers: {
          'x-oss-storage-class': 'Standard',
          'x-oss-object-acl': acl,
          // must add this header, otherwise the file will be downloaded instead of displayed
          'Content-Type': 'image/jpg',
        },
      });
      return {
        url: result.url,
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
    const fileKey = this.genFileKey({
      name: fileData.name,
      ext: fileData.ext || '',
    });

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

  genFileKey({ name, ext }: { ext: string; name: string }) {
    const extraDir =
      this.aliOssOptions.storageType === 'byDate'
        ? this.getFileDirByDate()
        : '';
    const fileKey = `${this.prefix_}${extraDir}${name}-${Date.now()}${ext}`;

    return fileKey;
  }

  getFileDirByDate() {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');

    const formattedDate = `${year}/${month}/${day}`;
    return formattedDate;
  }
}

export default AliSevice;

# medusa-file-ali

Aliyun OSS file connector for Medusa

## Features

- Store product images on Aliyun OSS
- Support for importing and exporting data through CSV files, such as Products or Prices.
- Support for Bucket Policies and User Permissions.

---

## Prerequisites

- [Medusa backend](https://docs.medusajs.com/development/backend/install)
- [Aliyun OSS](https://www.alibabacloud.com/help/en/oss/developer-reference/overview-21)

---

## How to Install

1\. Run the following command in the directory of the Medusa backend:

```bash
npm install medusa-file-ali
```

2\. Set the following environment variables in `.env`:

```bash
ALI_OSS_REGION=<YOUR_BUCKET_REGION>
ALI_OSS_BUCKET=<YOUR_BUCKET_NAME>
ALI_OSS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY_ID>
ALI_OSS_ACCESS_SECRET=<YOUR_SECRET_ACCESS_KEY>
ALI_OSS_PREFIX=<YOUR_BUCKET_PREFIX> (optional)
ALI_OSS_STORAGE_TYPE=<YOUR_BUCKET_PREFIX> (optional, you can set 'flat' or 'byDate')
```

3\. In `medusa-config.js` add the following at the end of the `plugins` array:

```js
const plugins = [
  // ...
  {
    resolve: `medusa-file-ali`,
    options: {
      region: process.env.ALI_OSS_REGION,
      bucket: process.env.ALI_OSS_BUCKET,
      accessKeyId: process.env.ALI_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALI_OSS_ACCESS_SECRET,
      prefix: process.env.ALI_OSS_PREFIX,
      storageType: process.env.ALI_OSS_STORAGE_TYPE,
    },
  },
];
```

---

## Test the Plugin

1\. Run the following command in the directory of the Medusa backend to run the backend:

```bash
npm run start
```

2\. Upload an image for a product using the admin dashboard or using [the Admin APIs](https://docs.medusajs.com/api/admin#tag/Upload).

---

### ALI_OSS_STORAGE_TYPE

you can set 'flat' or 'byDate'

- flat: all files will be stored in the root of the bucket
- byDate: files will be stored in a folder structure based on the date of upload, e.g. `[ALI_OSS_PREFIX]/2024/01/24/Filename.jpg`

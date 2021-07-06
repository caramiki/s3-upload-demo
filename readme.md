# Uploading to S3 Demo

## What you need

1. You should have [Node and NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed.
1. Run `npm install`. It will install these packages:
    - `aws-sdk`
    - `dotenv` - for reading environment variables
1. Copy `.env.example` to `.env` and fill out the environment variables:
    ```
    AWS_ACCESS_KEY_ID=
    AWS_SECRET_ACCESS_KEY=
    AWS_BUCKET=
    ```

## The AWS S3 API

### Creating an AWS S3 object

```js
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  params: { Bucket: AWS_BUCKET },
});
```

We'll go over:

- `s3.listObjects`
- `s3.upload`
- `s3.deleteObject`

Everything about Amazon's services is bonkers complicated and I'm sure `s3` does like a million more things but let's go over the basics.

### Reading files in your bucket

`s3.listObjects` lets you read objects in your bucket. It is asynchronous.

Pass `{ Prefix: 'some-directory/' }` to go in a particular directory in your bucket.

```js
new Promise((resolve, reject) => {
  s3.listObjects({ Prefix: 'uploads/' }, (err, data) => {
    if (err) reject(err);

    resolve(data.Contents);
  });
});
```

`data.Contents` will contain something like:

```js
[
  {
    Key: 'uploads/',
    LastModified: 2021-07-06T02:26:01.000Z,
    ETag: '"..."',
    Size: 0,
    StorageClass: 'STANDARD',
    Owner: {
      ID: '...'
    }
  },
  {
    Key: 'uploads/image1.jpg',
    LastModified: 2021-07-06T02:30:54.000Z,
    ETag: '"..."',
    Size: 197163,
    StorageClass: 'STANDARD',
    Owner: {
      ID: '...'
    }
  },
  {
    Key: 'uploads/image2.jpg',
    LastModified: 2021-07-06T02:30:53.000Z,
    ETag: '"..."',
    Size: 148718,
    StorageClass: 'STANDARD',
    Owner: {
      ID: '...'
    }
  }
]
```

It will include folders _and_ files, so just make sure you're anticipating that.

### Uploading files to your bucket

`s3.upload` lets you upload files to your bucket. It is also asynchronous.

```js
s3.upload({ Key: 'uploads/image3.jpg', Body: <Buffer...>, ACL: 'public-read' }, (err, data) => {
  // optionally do things with err and/or data
});
```

The content that you pass as the `Body` should be the data you want to upload. In the case of an image, this is some raw binary data.

### Deleting files from your bucket

`s3.deleteObject` destroys files in your bucket. Also asynchronous.

```js
s3.deleteObject({ Key: 'uploads/image3.jpg' }, (err, data) => {
  // optionally do things with err and/or data
});
```

### Putting it all together!

Demo in [scripts/upload-image.js](https://github.com/caramiki/s3-upload-demo/blob/main/scripts/upload-images.js)

After configuring `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_BUCKET` in your `.env`, you can upload images via this command:

```
npm run upload-images
```

This is a custom command in `package.json`; it's another way of saying:

```
node scripts/upload-images.js
```

which is how you run arbitrary javascript files via node.

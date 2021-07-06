require('dotenv').config();

const AWS = require('aws-sdk');
const fs = require('fs');

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET,
} = process.env;

const s3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  params: { Bucket: AWS_BUCKET },
});

const uploadsDir = 'images/';
const uploadsAlbum = 'my-uploads/';

// images - array of file names
async function completeUploads(images) {
  if (images.length) {
    // We're structuring the objects we return this way:
    //   { Key: 'uploads/image.jpg', Body: <Buffer ...> }
    // because their keys are the keys S3 will want when uploading,
    // so we can just do a spread on the object when we pass it into
    // the upload method
    const imageBuffers = images.map(fileName => {
      return {
        Key: uploadsAlbum + fileName,
        Body: fs.readFileSync(uploadsDir + fileName)
      };
    });

    console.log(`Uploading ${images.length} image(s)`);
    return await uploadImages(imageBuffers);
  }

  console.log('No new images to upload');
  return true;
}

// images - array of objects containing a Key and a Body
async function uploadImages(images) {
  let failedUploads = [];

  const complete = await Promise.all(
    images.map(async image => {
      // example image object:
      //   { Key: 'uploads/image.jpg', Body: <Buffer ...> }
      return new Promise((resolve, reject) => {
        s3.upload({ ...image, ACL: 'public-read' }, (err, data) => {
          if (err) {
            console.log(`Failed to upload image: ${image.Key}\nError: ${err.message}`);
            failedUploads.push(image.Key);
          } else {
            console.log(`Uploaded ${image.Key}`);
          }

          resolve(true);
        });
      });
    })
  );

  if (complete) {
    if (failedUploads.length) {
      console.log(`Failed to upload ${failedUploads.length} image(s):`);
      console.log(failedUploads.join('\n'));
    }

    return true;
  }
}

// images - array of file names
async function completeDeletions(images) {
  if (images.length) {
    console.log(`Deleting ${images.length} image(s)`);
    return await deleteImages(images);
  }

  console.log('No outdated images to delete');
  return true;
}

// images - array of file names
async function deleteImages(images) {
  let failedDeletions = [];

  const complete = await Promise.all(
    images.map(image => {
      return new Promise((resolve, reject) => {
        // Unlike uploading images, we only need to know the image key to delete it,
        // so `images` is simply an array of file names as strings, from which we
        // can construct the keys
        const imageKey = uploadsAlbum + image;

        s3.deleteObject({ Key: imageKey }, (err, data) => {
          if (err) {
            console.log(`Failed to delete image: ${imageKey}\nError: ${err.message}`);
            failedDeletions.push(imageKey);
          } else {
            console.log(`Deleted ${imageKey}`);
          }

          resolve(true);
        });
      });
    })
  );

  if (complete) {
    if (failedDeletions.length) {
      console.log(`Failed to delete ${failedDeletions.length} image(s):`);
      console.log(failedDeletions.join('\n'));
    }

    return true;
  }
}

/* =========================================================================
   Main Flow
   ========================================================================= */

new Promise((resolve, reject) => {
  // Read the images in our S3 album
  s3.listObjects({ Prefix: uploadsAlbum }, async (err, data) => {
    if (err) {
      const listObjectsError = `Error while trying to read S3 bucket: ${err.message}`;

      console.log(listObjectsError);
      reject({ statusCode: 400, body: listObjectsError });

      return false;
    }

    // Step 1: Read our local uploads folder and get file names
    // e.g. ['image1.jpg', 'image2.png', 'image3.jpg']
    const localImages = fs.readdirSync(uploadsDir);

    // Step 2: Get the file names for the uploads in our S3 album
    //
    // data.Contents also contains the directory, so after we strip the album name from the
    // beginning of the file names, we need to remove the empty string from our array of file names
    const s3Images = data.Contents.map(image => image.Key.replace(uploadsAlbum, '')).
      filter(image => image !== '');

    // Step 3: Subtract album images from local images to find which local images need to be uploaded
    const newImages = localImages.filter(fileName => !s3Images.includes(fileName));

    // Step 4: Subtract local images from album images to find which album images need to be deleted
    const removedImages = s3Images.filter(fileName => !localImages.includes(fileName));

    // Step 5a: Upload new images
    //      5b: Delete removed images
    if (
      await completeUploads(newImages) &&
      await completeDeletions(removedImages)
    ) {
      resolve({ statusCode: 200, body: 'success' });
      return true;
    } else {
      reject({ statusCode: 400, body: 'Something mysterious went wrong' });
      return false;
    }
  });
});

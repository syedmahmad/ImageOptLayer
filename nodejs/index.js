const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const sharp = require('sharp');

async function getFilesRecursivelySub(sourceS3) {
    // Call the function to get list of items from S3.
    let result = await s3.listObjectsV2(sourceS3).promise();
    if(!result.IsTruncated) {
        // Recursive terminating condition.
        return result.Contents;
    } else {
        // Recurse it if results are truncated.
        sourceS3.ContinuationToken = result.NextContinuationToken;
        return result.Contents.concat(await getFilesRecursivelySub(sourceS3));
    }
}

async function getFilesRecursively(sourceS3) {
    return await getFilesRecursivelySub(sourceS3);
}

async function processImage(sourceS3, minWidthPixels, resizeRatio, sourceKey, destinationKey) {
     try {
        const sourceStream = await s3.getObject({ 
                Bucket: sourceS3.Bucket, 
                Key: sourceKey
            }).createReadStream();

        const image = sharp();
        sourceStream.pipe(image);
        const metadata = await image.metadata();
        
        // Determine the desired width
        var newWidth;
        if (metadata.width <= minWidthPixels) {
            newWidth = metadata.width;
        } else if (metadata.width > minWidthPixels 
            && metadata.width * resizeRatio < minWidthPixels) {
            newWidth = minWidthPixels;
        } else {
            newWidth = resizeRatio * metadata.width;
        }
        
        // Resize the image
        const output = await image.resize({
            width: parseInt(newWidth, 10)
        }).toBuffer();
        return output;
    } catch(err) {
        console.log("ERROR in processImage.......");
        console.log(sourceS3, minWidthPixels, resizeRatio, sourceKey, destinationKey);
        return null;
    }
    
}

async function writeDataBackToFolder(sourceS3, destinationS3, minWidthPixels, resizeRatio, data, startIndex, endingIndex) {
    var allowedFormat = ["jpeg", "png", "jpg"];
    if (data) {
        let i = 0;
        for (const file of data) {
            if(i >= startIndex && i <= endingIndex) {
                try {
                    if (file.Size != 0) {
                        if (file.Key && allowedFormat.includes(file.Key.split(".").slice(-1)[0])) {
                            var fileName = file.Key.split('/');
                            var sourceKey = file.Key;
                            var destinationKey = destinationS3.Prefix + fileName[fileName.length-1];
                            var optImage = await processImage(sourceS3, minWidthPixels, resizeRatio, sourceKey, destinationKey);
                            if (optImage != null) {
                                const contents = await s3.putObject({ Bucket: destinationS3.Bucket, Key: destinationKey, Body: optImage }).promise();
                            }
                        } else if (file.Key) {
                            // move non image file as it is ....
                            var fileName = file.Key.split('/');
                            var sourceKey = file.Key;
                            var destinationKey = destinationS3.Prefix + fileName[fileName.length-1];
                            const sourceStream = await s3.getObject({ Bucket: sourceS3.Bucket, Key: sourceKey }).promise();
                            const contents = await s3.putObject({ Bucket: destinationS3.Bucket, Key: destinationKey, ACL: 'public-read',  Body: sourceStream.Body }).promise();   
                        }
                    }
                }catch(err) {
                    console.log("Error in loop", file);
                }
            }
            i = i + 1;
          }
    }
}

exports.handler = async function(event, context, callback) {
    var {sourceS3, destinationS3, minWidthPixels, resizeRatio, startIndex, endingIndex} = event;
    try {
        var data = await getFilesRecursively(sourceS3);
        

       await writeDataBackToFolder(sourceS3, destinationS3, minWidthPixels, resizeRatio, data, startIndex, endingIndex);
        callback(null);
    } catch(err) {
        console.log("Unable to compress", err);
        callback(err);
    }
}

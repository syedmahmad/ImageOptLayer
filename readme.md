**This is Lambda function which is reading files in s3 bucket folder and after compressing with npm Sharp module** 
**Putting compressed files to destinatin folder.**
 
**Here is the test json input:**
```
{
  "sourceS3": {
   "Bucket": "xyzBucket",
   "Prefix": "test/"
 },
  "destinationS3": {
   "Bucket": "xyzBucket",
   "Prefix": "test-compress/"
 },
  "minWidthPixels": 400,
 "resizeRatio": 0.2,
 "startIndex": 0,
 "endingIndex": 10
}
```

# Prerequisite
1. You need to create a lambda function on aws.
2. Assgin IAM role to this lambda which contains full permissions of s3 bucket and cloudfront (to check logs of this lambda in cloudWatch)
3. You can use the above mentioned json test script and test the work.
4. This script is using npm sharp module for image compression. I have created lambda layer which contains Sharp module layer bnndle...
5. This script only compress ['png', 'jpeg', 'jpg'] file formats all other files (i-e 'svg', 'gif') inside the source folder will be moved to destination folder as it is.

# Layer Detail:
1. We have added a layer which contains npm sharp module bundled info.
2. There are 2 ways to include sharp module.
3. Ist is to include whole package in 1 project and upload compress folder as a lambda.
4. 2nd is to seprate your lambda logic in one index file and all the packages which you wanted to use inside your lambda
will be included sepratly as a layer.... I choose 2nd approach....

# Lambda Function Detail:
1. exports.handler = async function this is the starting point of this lambda....
2. This method getFilesRecursively() fetch all data files from s3 bucket source folder ..
3. S3 folder only allow 100 records at a time due to pagination so we need to do recursion and recursivly fetch whole bukcet source folder data.
4. This method writeDataBackToFolder() will loop on whole data and process images and put these comporessed images to destination bucket folder. All other data like gifs and svg will remain as it is in destination folder.
5. This lambda method using npm Sharp module for image compression.




import React, { useState } from 'react';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const [etagList, setEtagList] = useState([]);
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  async function uploadPart(url, partData, partno) {
    const response = await fetch(url, {
      method: 'PUT',
      body: partData,
    });
    if (!response.ok) {
      throw new Error('Failed to upload part: ' + response.statusText);
    }
    const etag = response.headers.get('ETag');
    if (!etag) {
      throw new Error('ETag not found in response headers');
    }
    console.log(etag);
    return { "partNumber": partno, etag };

  }

  async function startMultiUpload() {
    const response = await fetch('http://localhost:9090/createMultipartUpload', {
      method: 'POST',
      body: JSON.stringify({
      }),

    });
    const data = await response.json();
    console.log(data);
    return data;
  }
  async function completeMultipartUpload(etags, uploadId, fileName) {
    try {
      const response = await fetch('http://localhost:9090/CompleteMultipartUpload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "fileName": fileName,
          "uploadId": uploadId,
          "parts": etags,
        }),
      });

      // Check if the response is successful
      if (!response.ok) {
        throw new Error('Failed to complete multipart upload: ' + response.statusText);
      }

      // Parse the JSON response
      const data = await response.json();
      console.log(data);
      return data;
    } catch (error) {
      // Handle errors
      console.error('Error completing multipart upload:', error);
      throw error; // Re-throw the error to propagate it
    }
  }


  async function getUploadURLs(uploadId, numParts, fileName) {
    const response = await fetch('http://localhost:9090/getPresignedURLs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "fileName": fileName,
        "uploadId": uploadId,
        "parts": parseInt(numParts),
      }),
    })
    const data = await response.json();
    console.log(data);
    return data;
  }
  // async function uploadFileInParts(file, numParts, uploadUrl) {
  //   const partSize = Math.ceil(file.size / numParts);
  //   const uploadPromises = [];

  //   // Upload each part in parallel
  //   for (let i = 0; i < numParts; i++) {
  //     const startByte = i * partSize;
  //     const endByte = Math.min(startByte + partSize, file.size);
  //     const partData = file.slice(startByte, endByte);

  //     // Construct URL for each part if necessary (e.g., using uploadUrl)
  //     const partUploadUrl = uploadUrl + '?part=' + (i + 1);

  //     // Upload the part asynchronously and store the Promise
  //     uploadPromises.push(uploadPart(partUploadUrl, partData));
  //   }

  //   // Wait for all parts to be uploaded
  //   const responses = await Promise.all(uploadPromises);
  //   return responses;
  // }

  const handleUpload = async () => {
    // You can perform file upload logic here

    const uploadData = await startMultiUpload();
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const numParts = Math.ceil(selectedFile.size / chunkSize);
    const uploadURLs = await getUploadURLs(uploadData.uploadId, numParts, uploadData.fileName);

    const uploadPromises = [];
    for (let i = 0; i < numParts; i++) {
      const startByte = i * chunkSize;
      const endByte = Math.min(startByte + chunkSize, selectedFile.size);
      const partData = selectedFile.slice(startByte, endByte);
      const partUploadUrl = uploadURLs[i];
      uploadPromises.push(uploadPart(partUploadUrl, partData, i + 1));
    }
    const responses = await Promise.all(uploadPromises);

    const etags = responses.map((response) => {
      return {
        partNumber: response.partNumber,
        etag: response.etag,
      };
    });
    console.log(etags);
    const result = await completeMultipartUpload(etags, uploadData.uploadId, uploadData.fileName);
    console.log(result);






  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

export default App;

const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const fs = require('fs');
const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerName = "uploads";
const questionContainer = "questions";

async function getQuestions() {
    const containerClient = blobServiceClient.getContainerClient(questionContainer);
    const blobClient = containerClient.getBlobClient('questions.txt');
    const downloadBlockBlobResponse = await blobClient.download();
    const downloaded = (await streamToBuffer(downloadBlockBlobResponse.readableStreamBody)).toString();
    return downloaded.split('\n').map(q => q.trim()).filter(q => q.length > 0);
}

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

app.get('/questions', async (req, res) => {
    const questions = await getQuestions();
    res.json({ questions });
});

app.post('/upload', upload.single('photo'), async (req, res) => {
    const email = req.cookies.email;
    if (!email) return res.status(400).send("Missing email cookie.");

    const username = email.split('@')[0];
    const question = req.body.question;
    const file = req.file;

    const extension = path.extname(file.originalname);
    const blobName = `${username}_${question.replace(/\s+/g, '_')}${extension}`;

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadFile(file.path);
    fs.unlinkSync(file.path);

    res.send({ success: true });
});

app.get('/uploads', async (req, res) => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
        blobs.push(blob.name);
    }
    res.json({ blobs });
});

app.post('/delete', async (req, res) => {
    const { blobName } = req.body;
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.deleteBlob(blobName);
    res.send({ success: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));

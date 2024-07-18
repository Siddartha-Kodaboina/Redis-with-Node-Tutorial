const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { createClient } = require('redis');

const app = express();
app.use(cors());

const DEFAULT_EXPIRATION = 3600;
const redisClient = createClient({
    url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

app.get('/photos', async (req, res) => {
    try {
        const cachedPhotos = await redisClient.get('photos');
        if (cachedPhotos) {
            console.log("Returning from cached photos");
            return res.json(JSON.parse(cachedPhotos));
        }
    } catch (error) {
        console.error('Redis error:', error);
    }
    const albumId = req.query.albumId;
    console.log("Is it comming this far..?")
    try {
        const response = await axios.get("https://jsonplaceholder.typicode.com/photos", { params: { albumId } });
        await redisClient.set("photos", JSON.stringify(response.data), {
            EX: DEFAULT_EXPIRATION
        });
        console.log("Returning frm DB photos")
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching photos:', error);
        res.status(500).send('Failed to fetch photos');
    }
})

app.get('/photos/:id', async (req, res) => {
    const photoId = req.params.id;

    try {
        const cachedPhoto = await redisClient.get(`photos:${photoId}`);
        if (cachedPhoto) {
            console.log("Returning from cached photos");
            return res.json(JSON.parse(cachedPhoto));
        }
    } catch (error) {
        console.error('Redis error:', error);
    }

    try {
        const response = await axios.get(`https://jsonplaceholder.typicode.com/photos/${photoId}`);
        await redisClient.set(`photos:${photoId}`, JSON.stringify(response.data), {
            EX: DEFAULT_EXPIRATION
        });
        console.log("Returning from API");
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching photo ID:', error);
        res.status(500).send('Failed to fetch photo');
    }
});

app.listen(4000, () => console.log('Server running on http://localhost:4000'));

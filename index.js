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
        const data = await getOrSetCache('photos', async () => {
            const response = await axios.get("https://jsonplaceholder.typicode.com/photos");
            return response.data;
        });
        res.json(data);
    } catch (error) {
        console.error('Error fetching photos:', error);
        res.status(500).send('Failed to fetch photos');
    }
});

app.get('/photos/:id', async (req, res) => {
    const photoId = req.params.id;
    try {
        const data = await getOrSetCache(`photos:${photoId}`, async () => {
            const response = await axios.get(`https://jsonplaceholder.typicode.com/photos/${photoId}`);
            return response.data;
        });
        res.json(data);
    } catch (error) {
        console.error('Error fetching photos with id:', error);
        res.status(500).send('Failed to fetch photos with id');
    }
});

const getOrSetCache = async (key, callback) => {
    console.log('Getting inside the promise');
    try {
        let data = await redisClient.get(key);
        if (data != null) {
            console.log("Cache Hit");
            return JSON.parse(data);
        }
        console.log("Cache Miss");
        const freshData = await callback();
        await redisClient.set(key, JSON.stringify(freshData), {
            EX: DEFAULT_EXPIRATION
        });
        return freshData;
    } catch (err) {
        console.error('Redis error:', err);
        throw err;
    }

}


app.listen(4000, () => console.log('Server running on http://localhost:4000'));


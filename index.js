const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;



//midlleware
app.use(express.json());
app.use(cors());

//database connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ng69xjx.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.get('/', (req, res) => {
    res.send('bibliophile server running');
})

async function run() {
    try {
        //collections
        const usersCollection = client.db('bibliophile').collection('users');
        const categoriesCollection = client.db('bibliophile').collection('categories');


        //get categories from database
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        //add users to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const email = user.email;
            const query = {
                email: email
            }
            const savedUser = await usersCollection.findOne(query);
            if (!savedUser) {
                const result = await usersCollection.insertOne(user);
                res.send(result);
            }
        })

    }
    finally {

    }
}
run().catch(console.log())



app.listen(port, () => {
    console.log(`server running on ${port}`);
})


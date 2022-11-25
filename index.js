const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const booksCollection = client.db('bibliophile').collection('books');
        const bookingsCollection = client.db('bibliophile').collection('bookings');


        //get categories from database
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        //get the books data
        app.get('/category', async (req, res) => {
            const query = {};
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        //get category specific books data
        app.get('/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                category_id: id
            }
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        //get the user specific booking 
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = {
                email: email
            }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        // get one specific booking by id
        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await bookingsCollection.findOne(query);
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

        //add products from client to database
        app.post('/category', async (req, res) => {
            const book = req.body;
            const result = await booksCollection.insertOne(book);
            res.send(result);
        })

        //add to booking collection 
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.log())



app.listen(port, () => {
    console.log(`server running on ${port}`);
})


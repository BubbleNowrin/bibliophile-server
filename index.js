const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


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
        const paymentsCollection = client.db('bibliophile').collection('payments');


        //get categories from database
        app.get('/categories', async (req, res) => {
            const query = {};
            const result = await categoriesCollection.find(query).toArray();
            res.send(result);
        })

        //get the books data
        app.get('/books', async (req, res) => {
            const query = {};
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        //get category specific books data
        app.get('/books/:id', async (req, res) => {
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

        //get all the buyers
        app.get('/buyers', async (req, res) => {
            const query = {
                role: 'Buyer'
            }
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers);
        })

        //get all the sellers
        app.get('/sellers', async (req, res) => {
            const query = {
                role: 'Seller'
            }
            const sellers = await usersCollection.find(query).toArray();
            res.send(sellers);
        })

        //get verified sellers
        app.get('/verifiedSeller', async (req, res) => {
            const email = req.query.email;
            const query = {
                verifyStatus: true,
                email: email
            }
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        //get my products
        app.get('/myBooks', async (req, res) => {
            const email = req.query.email;
            const query = {
                sellerEmail: email
            }
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        //get books with advertise field
        app.get('/advertised', async (req, res) => {
            const query = {
                advertise: "true"
            }
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        //get reported books
        app.get('/reported', async (req, res) => {
            const query = {
                report: "true"
            }
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        // check admin
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === "Admin" });
        })

        //check seller
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === "Seller" });
        })

        //check buyer
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email);
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === "Buyer" });
        })

        //payment intent
        app.post("/create-payment-intent", async (req, res) => {
            const booking = req.body;
            const price = booking.resalePrice;
            const amount = price * 100;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ]
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        //add payment info to database
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = {
                _id: ObjectId(id)
            }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingsCollection.updateOne(filter, updatedDoc);
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
        app.post('/books', async (req, res) => {
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

        //delete buyer
        app.delete('/buyers/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = {
                _id: ObjectId(id)
            }
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        //delete seller
        app.delete('/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        //delete specific book from my products
        app.delete('/books/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const result = await booksCollection.deleteOne(filter);
            res.send(result);
        })

        //delete reported item
        app.delete('/reported/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const result = await booksCollection.deleteOne(filter);
            res.send(result);
        })

        //update seller verification status
        app.put('/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    verifyStatus: true
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        //update field for advertise
        app.put('/books/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: "true"
                }
            }
            const result = await booksCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        //update field for report
        app.put('/reported/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    report: "true"
                }
            }
            const result = await booksCollection.updateOne(filter, updatedDoc, options);
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


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

//Jwt Token implementation
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        //collections
        const usersCollection = client.db('bibliophile').collection('users');
        const categoriesCollection = client.db('bibliophile').collection('categories');
        const booksCollection = client.db('bibliophile').collection('books');
        const bookingsCollection = client.db('bibliophile').collection('bookings');
        const paymentsCollection = client.db('bibliophile').collection('payments');
        const reportsCollection = client.db('bibliophile').collection('reports');

        //verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };

            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Admin') {
                return res.status(403).send({ message: 'forbidden Access' });
            }
            next();
        }

        //verifySeller
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };

            const user = await usersCollection.findOne(query);
            if (user?.role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden Access' });
            }
            next();
        }


        //jwt token
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
            res.send({ token })
        })


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
                category_id: id,
                status: 'available'
            }
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        //get the user specific booking 
        app.get('/bookings', verifyJWT, async (req, res) => {
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
        app.get('/buyers', verifyJWT, verifyAdmin, async (req, res) => {
            const query = {
                role: 'Buyer'
            }
            const buyers = await usersCollection.find(query).toArray();
            res.send(buyers);
        })

        //get all the sellers
        app.get('/sellers', verifyJWT, verifyAdmin, async (req, res) => {
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
        app.get('/myBooks', verifyJWT, verifySeller, async (req, res) => {
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
                advertise: "true",
                status: 'available'
            }
            const result = await booksCollection.find(query).toArray();
            res.send(result);
        })

        //get reported books
        app.get('/reported', verifyJWT, verifyAdmin, async (req, res) => {
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
        app.post("/create-payment-intent", verifyJWT, async (req, res) => {
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
        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const bookId = payment.bookId;
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

            const query = {
                _id: ObjectId(bookId)
            }
            const updateStatus = {
                $set: {
                    status: 'sold'
                }
            }
            const updateStatusResult = await booksCollection.updateOne(query, updateStatus);
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
        app.post('/books', verifyJWT, verifySeller, async (req, res) => {
            const book = req.body;
            const result = await booksCollection.insertOne(book);
            res.send(result);
        })

        //add to booking collection 
        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        //delete buyer
        app.delete('/buyers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = {
                _id: ObjectId(id)
            }
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        //delete seller
        app.delete('/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        //delete specific book from my products
        app.delete('/books/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const result = await booksCollection.deleteOne(filter);
            res.send(result);
        })

        //delete reported item
        app.delete('/reported/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const result = await booksCollection.deleteOne(filter);
            res.send(result);
        })

        //update seller verification status
        app.put('/sellers/:id', verifyJWT, verifyAdmin, async (req, res) => {
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
        app.put('/books/:id', verifyJWT, verifySeller, async (req, res) => {
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
        app.put('/reported/:id', verifyJWT, async (req, res) => {
            const report = req.body;
            const query = {
                email: report.email,
                reportId: report.reportId
            }

            const find = await reportsCollection.findOne(query);
            if (find) {
                return res.send({ error: true })
            }
            const insert = await reportsCollection.insertOne(report);
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


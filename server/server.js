const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PORT = 8081;
const JWT_SECRET = 'your-secret-key-change-in-production';

const app = express();
app.use(cors());
app.use(express.json());
const uri = "mongodb+srv://Hrishi:abcdefgh@cluster0.kgpe8ez.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const products = {
    1: { name: "Laptop", price: "95000.00", supplier: "Gadget360" },
    2: { name: "Smartphone", price: "57990.00", supplier: "MobileDokan" },
    3: { name: "Headphones", price: "4500.00", supplier: "DEFY Gravity" }
};

const orders = [];

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }

});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).send("No token provided");
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).send("Invalid token");
    }
};

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");
    
    const productCollection = client.db('supply-chain-project').collection('product');
    const orderCollection = client.db('supply-chain-project').collection('order');
    const userCollection = client.db('supply-chain-project').collection('users');

    // Register Route
    app.post('/register', async(req, res) => {
        const { email, password, fullName } = req.body;

        if (!email || !password || !fullName) {
            return res.status(400).send("All fields are required");
        }

        try {
            const existingUser = await userCollection.findOne({ email });
            if (existingUser) {
                return res.status(400).send("User already exists");
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                email,
                fullName,
                password: hashedPassword,
                createdAt: new Date()
            };

            const result = await userCollection.insertOne(newUser);
            res.status(201).send("User registered successfully");
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // Login Route
    app.post('/login', async(req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send("Email and password are required");
        }

        try {
            const user = await userCollection.findOne({ email });
            if (!user) {
                return res.status(401).send("Invalid email or password");
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).send("Invalid email or password");
            }

            const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ 
                message: "Login successful", 
                token, 
                user: { email: user.email, fullName: user.fullName } 
            });
        } catch (error) {
            res.status(500).send(error.message);
        }
    });

    // Get Products
    app.get('/products', (req, res) => {
        res.json(Object.entries(products).map(([id, product]) => ({
            id: parseInt(id),
            ...product
        })));
    });

    // Place Order (Protected Route)
    app.post('/order', verifyToken, async(req, res) => {
        const { product_id, customer, quantity } = req.body;
        
        if (!products[product_id]) {
            return res.status(404).send("Product not found");
        }

        const unitPrice = parseFloat(products[product_id].price);
        const totalPrice = unitPrice * quantity;

        const newOrder = {
            userId: req.user.userId,
            product_id,
            product_name: products[product_id].name,
            customer,
            quantity,
            price: totalPrice.toFixed(2),
            status: "Completed",
            createdAt: new Date()
        };
        
        console.log(newOrder);
        try {
            const result = await orderCollection.insertOne(newOrder);
            console.log("Order inserted successfully:", result.insertedId);
            res.status(200).send("Order placed successfully");
        } catch (error) {
            console.error("Error inserting order:", error);
            res.status(500).send("Error placing order: " + error.message);
        }
    });

    // Get Orders (Protected Route)
    app.get('/orders', verifyToken, async(req, res) => {
        const orders = await orderCollection.find({ userId: req.user.userId }).toArray();
        res.json(orders);
    });

    // Health Check
    app.get('/', (req, res) => {
        res.send('Server is running');
    });

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
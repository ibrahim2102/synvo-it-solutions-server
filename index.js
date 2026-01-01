const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3000;



// middleware

app.use(cors());
app.use(express.json());


const uri = process.env.MONGODB_URI;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// routes

app.get("/productss", (req, res) => {
  const products = [
    { id: 1, name: "Laptop", price: 1200 },
    { id: 2, name: "Smartphone", price: 800 },
    { id: 3, name: "Tablet", price: 500 },
    { id: 4, name: "Monitor", price: 300 },
    { id: 5, name: "Keyboard", price: 50 },
  ];
  res.json(products);
});





app.get('/', (req, res) => {
    res.send('Server is running');

})

async function run () {
        
    try {
         // await client.connect();

         const db = client.db('synvo_db');
         const productsCollection = db.collection('products');
         const bookingsCollection = db.collection('my_services');
         const usersCollection = db.collection('users');


        //  reviews api
            
       app.post('/products/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, clientEmail, clientName, bookingId } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be 1–5.' });
    }

    const serviceObjectId = new ObjectId(id);

    const review = {
      _id: new ObjectId(),          
      bookingId,
      clientEmail,
      clientName,
      rating,
      comment,
      createdAt: new Date(),
    };

    const service = await productsCollection.findOne({ _id: serviceObjectId });
    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    const currentTotal = service.ratingTotal || 0;
    const reviewCount = (service.reviewCount || 0) + 1;
    const ratingTotal = currentTotal + rating;
    const averageRating = ratingTotal / reviewCount;

    await productsCollection.updateOne(
      { _id: serviceObjectId },
      {
        $push: { reviews: review },
        $set: {
          ratingTotal,
          reviewCount,
          averageRating,
        },
      }
    );

    res.status(201).json({ review, averageRating, reviewCount });
  } catch (err) {
    console.error('[POST /products/:id/reviews]', err);
    res.status(500).json({ message: 'Failed to submit review.' });
  }
});


         app.get('/products/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await productsCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { reviews: 1, averageRating: 1, reviewCount: 1 } }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found.' });
    }

    res.json({
      reviews: service.reviews || [],
      averageRating: service.averageRating || 0,
      reviewCount: service.reviewCount || 0,
    });
  } catch (err) {
    console.error('[GET /products/:id/reviews]', err);
    res.status(500).json({ message: 'Failed to load reviews.' });
  }
});




        //    users api
         app.post('/users', async (req, res) => {
            const newUser = req.body;

            const email = req.body.email;
            const query = {email: email};
            const existingUser = await usersCollection.findOne(query);

            if(existingUser) {
                return res.send({message: 'User already exists'});
            }

            else {
                const result = await usersCollection.insertOne(newUser);
            res.send(result);
            }
    
         })

          

         app.get('/products', async (req, res) => {
            const cursor = productsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
         })


          app.get('/products/:id', async (req, res) => {
     const { id } = req.params;
     const product = await productsCollection.findOne({ _id: new ObjectId(id) });
     if (!product) return res.status(404).json({ message: 'Not found' });
     res.json({ ...product, _id: product._id.toString() });
   });
        
   

           app.post('/bookings', async (req, res) => {
     const booking = req.body;
     booking.createdAt = new Date();

     const result = await bookingsCollection.insertOne(booking);
     res.status(201).json({ ...booking, _id: result.insertedId.toString() });
   });

   app.get('/bookings', async (req, res) => {
  try {
    const { clientEmail, providerEmail } = req.query;
    const query = {};

    if (clientEmail) query.clientEmail = clientEmail;
    if (providerEmail) query.providerEmail = providerEmail;

    const bookings = await bookingsCollection.find(query).toArray();

    res.json(
      bookings.map((booking) => ({
        ...booking,
        _id: booking._id.toString(),
      }))
    );
  } catch (err) {
    console.error('[GET /bookings]', err);
    res.status(500).json({ message: 'Failed to load bookings' });
  }
});

//   update profile


app.patch('/users/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const updateFields = {};

    if (typeof req.body.name === 'string') {
      updateFields.name = req.body.name;
    }
    if (typeof req.body.photoURL === 'string') {
      updateFields.photoURL = req.body.photoURL;
    }

    if (!Object.keys(updateFields).length) {
      return res.status(400).json({ message: 'Nothing to update.' });
    }

    const result = await usersCollection.updateOne(
      { email },
      { $set: updateFields }
    );

    if (!result.matchedCount) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'Profile updated.', email, ...updateFields });
  } catch (err) {
    console.error('[PATCH /users/:email]', err);
    res.status(500).json({ message: 'Failed to update user.' });
  }
});



    app.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await bookingsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking deleted', _id: id });
  } catch (err) {
    console.error('[DELETE /bookings/:id]', err);
    res.status(500).json({ message: 'Failed to delete booking' });
  }
});





         app.post('/products', async (req, res) => {
            const newProduct = req.body;
            const result = await productsCollection.insertOne(newProduct);
            res.send(result);

            })

            app.patch('/products/:id', async (req, res) => {
                const id = req.params.id;
                const updatedProduct = req.body;
                const query = {_id: new ObjectId(id)};
                const update = {
                    $set: {
                        name: updatedProduct.name,
                        price: updatedProduct.price
                    }
                }
                const result = await productsCollection.updateOne(query, update);
                res.send(result);
            })


            app.delete('/products/:id', async (req, res) => {
                const id = req.params.id;
                const query = {_id: new ObjectId(id)};
                const result = await productsCollection.deleteOne(query);
                res.send(result);
            })





         // await client.db("admin").command({ ping: 1 });
         console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }

    finally {

    }

}

run().catch(console.dir);


 app.listen(port, () => {
    console.log(`server is running on port: ${port} `);
})



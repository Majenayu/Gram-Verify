const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { MongoClient } = require('mongodb');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = 3000;

// Cloudinary config
cloudinary.config({
  cloud_name: 'dxijtk4uh',
  api_key: '673884187959811',
  api_secret: 'IoNIcYPj__zDx4C0_thf1x3Z7gk'
});

// MongoDB
const mongoURI = 'mongodb+srv://ADD:ADD@add.6socxdt.mongodb.net/?retryWrites=true&w=majority&appName=ADD';
const client = new MongoClient(mongoURI);
let db;
client.connect().then(() => {
  db = client.db('users');
  console.log('Connected to MongoDB');
});

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files from the root directory

// Serve index page
app.get('/', (req, res) => {
  res.send(`
    <html><head><title>Welcome</title></head>
    <body style="font-family:sans-serif; text-align:center;">
      <h1>Welcome to Divizira</h1>
      <a href="/login">Login</a> | <a href="/register">Register</a>
    </body></html>
  `);
});

// Serve login page
app.get('/login', (req, res) => {
  res.send(`
    <html><head><title>Login</title></head>
    <body style="font-family:sans-serif; text-align:center;">
      <h2>Login Page</h2>
      <form>
        <input type="text" placeholder="Card No"><br><br>
        <button>Login</button>
      </form>
      <p><a href="/">Back</a></p>
    </body></html>
  `);
});

// Serve register page
app.get('/register', (req, res) => {
  res.send(`
    <html>
    <head><title>Register</title></head>
    <body style="font-family:sans-serif; padding:20px;">
      <h2>Registration</h2>
      <form id="registrationForm" enctype="multipart/form-data" method="post" action="/register">
        <input type="text" name="fullName" placeholder="Full Name" required><br><br>
        <input type="date" name="dob" required><br><br>
        <input type="tel" name="mobile" placeholder="Mobile" required><br><br>
        <input type="text" name="bankAccount" placeholder="Bank Account" required><br><br>
        <input type="text" name="ifsc" placeholder="IFSC Code" required><br><br>
        <input type="text" name="nomineeName" placeholder="Nominee Name" required><br><br>
        <input type="text" name="nomineeRelation" placeholder="Nominee Relationship" required><br><br>
        <label>Upload Photo:</label><br>
        <input type="file" name="photo" required><br><br>
        <label>Upload Documents:</label><br>
        <input type="file" name="documents" multiple required><br><br>
        <button type="submit">Register</button>
      </form>

      <div id="cardDisplay"></div> <!-- Display the card number here -->

      <script src="/script.js"></script>
    </body>
    </html>
  `);
});

// Handle form submission
app.post('/register', upload.fields([{ name: 'photo' }, { name: 'documents' }]), async (req, res) => {
    try {
      const data = req.body;
  
      // Ensure photo exists in the request
      if (!req.files.photo) {
        return res.status(400).json({ message: 'Photo is required.' });
      }
  
      // Log the file information for debugging
      console.log('Uploaded photo:', req.files.photo[0]);
      
      // Validate photo file type
      const photoFile = req.files.photo[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(photoFile.mimetype)) {
        return res.status(400).json({ message: 'Invalid image file type. Please upload a .jpeg, .jpg, or .png file.' });
      }
  
      // Generate card number
      const cardNo = Math.floor(Math.random() * 9000) + 1000;
  
      // Upload photo to Cloudinary
      const photo = await cloudinary.uploader.upload(photoFile.path, { folder: cardNo.toString() });
  
      // Upload documents (if any) to Cloudinary
      const docs = req.files.documents ? await Promise.all(
        req.files.documents.map(file =>
          cloudinary.uploader.upload(file.path, { folder: cardNo.toString() })
        )
      ) : [];
  
      // Prepare user data
      const userData = {
        ...data,
        cardNo,
        photo: photo.secure_url,
        documents: docs.map(d => d.secure_url)  // Map the uploaded document URLs
      };
  
      // Save user data in MongoDB collection named by cardNo
      await db.collection(cardNo.toString()).insertOne(userData);
  
      // Respond with the card number
      res.json({ cardNo });
    } catch (err) {
      console.error('Error during registration:', err);
      res.status(500).json({ message: 'Something went wrong during registration.' });
    }
  });
  
  




















  app.post('/login', async (req, res) => {
    const { cardNo } = req.body;
  
    try {
      const collections = await db.listCollections().toArray();
      const exists = collections.some(col => col.name === cardNo);
  
      if (exists) {
        res.json({ success: true, cardNo });
      } else {
        res.status(404).json({ success: false, message: 'Card number not found' });
      }
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  





app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.get('/api/userinfo', async (req, res) => {
  const cardNo = req.query.cardNo;

  try {
    const collection = db.collection(cardNo);
    const user = await collection.findOne({});

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user); // send user info as JSON
  } catch (err) {
    console.error('Dashboard API error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

  
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

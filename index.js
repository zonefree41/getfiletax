require('dotenv').config();
const express = require('express');
const path = require('path');
console.log("Loaded Stripe Key:", process.env.STRIPE_SECRET_KEY?.slice(0, 10));
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require("fs");
const multer = require("multer");
const { S3Client } = require("@aws-sdk/client-s3");
const multerS3 = require("multer-s3");

const app = express();

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// =================== Routes ===================

// Home
app.get('/', (req, res) => res.redirect('/home'));
app.get('/home', (req, res) => res.render('home'));

// Static pages
app.get('/about-us', (req, res) => res.render('about-us'));
app.get('/contact-us', (req, res) => res.render('contact-us'));
app.get('/pricing', (req, res) => res.render('pricing'));
app.get("/checkout", (req, res) => res.render("checkout"));
app.get('/services', (req, res) => res.render('services'));
app.get('/faq', (req, res) => res.render('faq'));
app.get('/sitemap', (req, res) => res.render('sitemap'));

// Terms & Privacy
const companyInfo = {
    name: "Tax Expert",
    address: "320 23rd St, Arlington, VA, 22202 USA",
    contactEmail: "info@tax-expert.pro"
};

app.get('/terms', (req, res) =>
    res.render("terms-of-services", { company: { name: "Tax Expert", address: "320 23rd St, Arlington, VA, 22202 USA", contactEmail: "info@tax-expert.pro" } }));
app.get('/privacy', (req, res) =>
    res.render("privacy-policy", { company: { name: "Tax Expert", address: "320 23rd St, Arlington, VA, 22202 USA", contactEmail: "info@tax-expert.pro" } }));

// Booking & consultation pages
app.get('/book-now', (req, res) => res.render('book-now'));
app.get('/appointment', (req, res) => res.render('appointment'));
app.get('/book-an-appointment', (req, res) => res.render('book-an-appointment'));
app.get('/get-consultation', (req, res) => res.render('get-consultation'));
app.get('/upload-documents', (req, res) => res.render('upload-documents'));
app.get('/upload-forms', (req, res) => res.render('upload-forms'));
app.get('/get-free-consultation', (req, res) => res.render('get-free-consultation'));
app.get('/view-our-services', (req, res) => res.render('view-our-services'));
app.get('/get-started', (req, res) => res.render('get-started'));
app.get('/book', (req, res) => res.render('book'));
app.get('/explore', (req, res) => res.render('explore'));

// Blog pages
app.get('/blog', (req, res) => res.render('blog'));
app.get('/blog1', (req, res) => res.render('blog1'));
app.get('/blog2', (req, res) => res.render('blog2'));
app.get('/blog3', (req, res) => res.render('blog3'));

// Stripe Checkout routes
app.post('/checkout/individual', async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: 'Single Filing' },
                unit_amount: 13000 // $130.00 in cents
            },
            quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.BASE_URL}/success`,
        cancel_url: `${process.env.BASE_URL}/get-started?canceled=true`
    });
    res.redirect(session.url);
});

app.post('/checkout/business', async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: 'Business Tax Filing' },
                unit_amount: 25000 // $250.00 in cents
            },
            quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.BASE_URL}/success`,
        cancel_url: `${process.env.BASE_URL}/get-started?canceled=true`
    });
    res.redirect(session.url);
});

app.post('/checkout/family', async (req, res) => {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: 'Married Filing Jointly' },
                unit_amount: 15000 // $150.00 in cents
            },
            quantity: 1
        }],
        mode: 'payment',
        success_url: `${process.env.BASE_URL}/success`,
        cancel_url: `${process.env.BASE_URL}/get-started?canceled=true`
    });
    res.redirect(session.url);
});

// Payment success / cancel pages
app.get('/success', (req, res) => res.render('success'));
app.get('/cancel', (req, res) => res.redirect('/get-started'));

// =================== File Upload (W-2 / 1099) ===================

// =================== File Upload (Local) ===================

// Create local uploads folder (for dev)
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);

const localStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const localUpload = multer({ storage: localStorage });

// =================== AWS S3 (SDK v3) storage (for production) ===================

// Initialize S3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,   // e.g. "us-east-1"
    credentials: {
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
    },
});

// Configure Multer-S3 storage
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME, // put your bucket name in .env
        acl: "private", // or "public-read" if you want public access
        key: (req, file, cb) => {
            cb(null, Date.now().toString() + "-" + file.originalname);
        },
    }),
});

// Upload route
app.post("/upload", upload.single("file"), (req, res) => {
    res.send({
        message: "✅ File uploaded successfully to S3",
        fileUrl: req.file.location, // URL to the uploaded file
    });
});



// =================== Upload Routes ===================

// form page
app.get("/upload-forms", (req, res) => res.render("upload-forms"));


// Upload locally (dev/test)
app.post("/upload-forms", localUpload.array("documents", 10), (req, res) => {
    console.log("Local Uploaded files:", req.files.map(f => f.location));

    res.render("upload-success", { files: req.files });
});

// Upload to S3 (production)
app.post("/upload-forms-s3", upload.array("documents", 10), (req, res) => {
    console.log("S3 Uploaded:", req.files.map(f => f.location));
    res.render("upload-success", { files: req.files });
});

// =================== Upload Route ===================

// Serve local uploads folder (optional, only works if using local storage)
app.use("/uploads", express.static(path.join(__dirname, 'uploads')));

// =================== Start Server ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

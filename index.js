require('dotenv').config();
const express = require('express');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Debug Stripe key
console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY);

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

app.get("/terms", (req, res) => res.render("terms", { company: { name: "Tax Expert", address: "320 23rd St, Arlington, VA, 22202 USA", contactEmail: "info@tax-expert.pro" } }));
app.get("/privacy", (req, res) => res.render("privacy", { company: { name: "Tax Expert", address: "320 23rd St, Arlington, VA, 22202 USA", contactEmail: "info@tax-expert.pro" } }));

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
const fs = require("fs");
const multer = require("multer");

const uploadPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Handle multiple uploads (e.g. W-2, 1099, etc.)
app.post("/upload-forms", upload.array("documents", 10), (req, res) => {
    console.log("Uploaded files:", req.files);
    res.render("upload-success", { files: req.files });
});



app.use("/uploads", express.static(uploadPath));


// =================== Start Server ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

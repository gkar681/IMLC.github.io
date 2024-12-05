const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('view engine', 'ejs');

// Serve static files from the public folder (including index.html)
app.use(express.static('staticpages'));

// Route for the blog page, rendering blog.ejs
app.get('/blog', (req, res) => {
    const postsDir = path.join(__dirname, 'posts');
    const posts = fs.readdirSync(postsDir).map(filename => {
        const content = fs.readFileSync(path.join(postsDir, filename), 'utf8');
        return JSON.parse(content);
    });

    res.render('blog', { posts });
});

// Optionally, add a 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


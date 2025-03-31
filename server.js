const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const app = express();
app.set('view engine', 'ejs');
app.use(express.json());

// Serve static files from the public folder (including index.html)
app.use(express.static('staticpages'));

// Store comments in a JSON file
const COMMENTS_FILE = path.join(__dirname, 'data', 'comments.json');

// Ensure comments file exists
async function initializeCommentsFile() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        try {
            await fs.access(COMMENTS_FILE);
        } catch {
            await fs.writeFile(COMMENTS_FILE, '{}');
        }
    } catch (error) {
        console.error('Error initializing comments file:', error);
    }
}

// Helper function to read posts
function getPost(filename) {
    const filePath = path.join(__dirname, 'posts', `${filename}.md`);
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContent);
        return {
            ...data,
            content: marked(content),
            slug: filename
        };
    } catch (err) {
        return null;
    }
}

function getAllPosts() {
    const postsDir = path.join(__dirname, 'posts');
    return fs.readdirSync(postsDir)
        .filter(filename => filename.endsWith('.md'))
        .map(filename => {
            const filePath = path.join(postsDir, filename);
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const { data, content } = matter(fileContent);
            return {
                ...data,
                content: marked(content),
                slug: filename.replace('.md', '')
            };
        });
}

// Route for the blog listing page
app.get('/blog', (req, res) => {
    const posts = getAllPosts();
    res.render('blog', { posts });
});

// Route for individual blog posts
app.get('/blog/:slug', (req, res) => {
    const post = getPost(req.params.slug);
    if (!post) {
        return res.status(404).send('Post not found');
    }
    res.render('post', { post });
});

// Get comments for a post
app.get('/api/comments/:postSlug', async (req, res) => {
    try {
        const comments = JSON.parse(await fs.readFile(COMMENTS_FILE, 'utf8'));
        res.json(comments[req.params.postSlug] || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load comments' });
    }
});

// Add a new comment
app.post('/api/comments', async (req, res) => {
    try {
        const { name, content, postSlug, date } = req.body;
        
        // Basic validation
        if (!name || !content || !postSlug) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Load existing comments
        const comments = JSON.parse(await fs.readFile(COMMENTS_FILE, 'utf8'));
        
        // Initialize array for this post if it doesn't exist
        if (!comments[postSlug]) {
            comments[postSlug] = [];
        }

        // Add new comment
        comments[postSlug].push({
            id: Date.now(),
            name,
            content,
            date
        });

        // Save updated comments
        await fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save comment' });
    }
});

// Optionally, add a 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).send('Page not found');
});

// Initialize comments file and start server
initializeCommentsFile().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});


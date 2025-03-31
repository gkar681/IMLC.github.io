const fs = require('fs').promises;
const path = require('path');

// Template for blog posts
const postTemplate = (post) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} - In My Lightcone</title>
    <link rel="stylesheet" href="../assets/styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Gloria+Hallelujah&family=Permanent+Marker&display=swap" rel="stylesheet">
</head>
<body>
    <header>
        <div class="navbar">
            <div class="blog-details">
                In My Lightcone 
            </div>
            <nav class="nav-links">
                <a href="../index.html">Home</a>
                <a href="../about.html">About</a>
                <a href="../tags.html">Tags</a>
                <a href=>Notes</a>
            </nav>
        </div>
    </header>

    <main>
        <article class="blog-post">
            <h1>${post.title}</h1>
            <div class="post-metadata">
                <span class="date">${post.date}</span> • 
                <span class="category"><a href="../categories.html?category=${post.category}">${post.category}</a></span> • 
                <span class="tags">
                    ${post.tags.map(tag => `<a href="../tags.html?tag=${tag}">${tag}</a>`).join(', ')}
                </span>
            </div>
            <div class="post-content">
                ${post.content}
            </div>
        </article>

        <section class="comments-section">
            <h2>Comments</h2>
            <div id="comments-container">
                <!-- Comments will be loaded here -->
            </div>
            
            <form id="comment-form" class="comment-form">
                <h3>Leave a Comment</h3>
                <div class="form-group">
                    <label for="name">Name:</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div class="form-group">
                    <label for="comment">Comment:</label>
                    <textarea id="comment" name="comment" required></textarea>
                </div>
                <button type="submit">Submit Comment</button>
            </form>
        </section>

        <script>
            const postSlug = '${post.slug}';
            
            // Load comments
            async function loadComments() {
                try {
                    const response = await fetch(\`/api/comments/\${postSlug}\`);
                    const comments = await response.json();
                    displayComments(comments);
                } catch (error) {
                    console.error('Error loading comments:', error);
                }
            }

            // Display comments
            function displayComments(comments) {
                const container = document.getElementById('comments-container');
                if (comments.length === 0) {
                    container.innerHTML = '<p>No comments yet. Be the first to comment!</p>';
                    return;
                }

                container.innerHTML = comments.map(comment => \`
                    <div class="comment">
                        <div class="comment-header">
                            <span class="comment-author">\${comment.name}</span>
                            <span class="comment-date">\${new Date(comment.date).toLocaleDateString()}</span>
                        </div>
                        <div class="comment-content">
                            <p>\${comment.content}</p>
                        </div>
                    </div>
                \`).join('');
            }

            // Handle comment submission
            document.getElementById('comment-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    name: document.getElementById('name').value,
                    content: document.getElementById('comment').value,
                    postSlug: postSlug,
                    date: new Date().toISOString()
                };

                try {
                    const response = await fetch('/api/comments', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });

                    if (response.ok) {
                        document.getElementById('comment-form').reset();
                        loadComments(); // Reload comments
                    } else {
                        throw new Error('Failed to submit comment');
                    }
                } catch (error) {
                    console.error('Error submitting comment:', error);
                    alert('Failed to submit comment. Please try again.');
                }
            });

            // Load comments when page loads
            loadComments();
        </script>
    </main>

    <footer>
    </footer>
</body>
</html>`;

// Function to update posts array in HTML files
const updatePostsArray = async (posts) => {
    const postsArrayString = JSON.stringify(posts, null, 4);
    
    // Read the files
    const indexPath = path.join(__dirname, '..', 'index.html');
    const tagsPath = path.join(__dirname, '..', 'tags.html');
    
    for (const filePath of [indexPath, tagsPath]) {
        let content = await fs.readFile(filePath, 'utf8');
        
        // Replace the posts array
        content = content.replace(
            /const posts = \[[\s\S]*?\];/m,
            `const posts = ${postsArrayString};`
        );
        
        await fs.writeFile(filePath, content, 'utf8');
    }
};

async function build() {
    try {
        // Create posts directory if it doesn't exist
        const postsDir = path.join(__dirname, '..', 'posts');
        await fs.mkdir(postsDir, { recursive: true });

        // Read all JSON files in the posts directory
        const files = await fs.readdir(postsDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        const posts = [];

        // Process each JSON file
        for (const jsonFile of jsonFiles) {
            const jsonContent = await fs.readFile(path.join(postsDir, jsonFile), 'utf8');
            const post = JSON.parse(jsonContent);
            
            // Add to posts array
            posts.push({
                title: post.title,
                date: post.date,
                category: post.category,
                tags: post.tags,
                slug: path.basename(jsonFile, '.json'),
                abstract: post.abstract
            });

            // Generate HTML file
            const htmlContent = postTemplate(post);
            const htmlPath = path.join(postsDir, `${path.basename(jsonFile, '.json')}.html`);
            await fs.writeFile(htmlPath, htmlContent, 'utf8');
        }

        // Sort posts by date (newest first)
        posts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Update posts array in index.html and tags.html
        await updatePostsArray(posts);

        console.log('Build completed successfully!');
    } catch (error) {
        console.error('Build failed:', error);
    }
}

build(); 
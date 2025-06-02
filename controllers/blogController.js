const Blog = require("../models/Blog");

exports.createBlog = async (req, res) => {
  try {
    const { title, category, tags, content, status, featuredImage } = req.body;
    const userId = req.user.userId; // from auth middleware

    if (!title || !category || !content || !featuredImage) {
      return res.status(400).json({ message: "Title, category, content, and featured image are required." });
    }

    const blog = new Blog({
      title,
      category,
      tags,
      content,
      status,
      featuredImage,
      author: userId,
    });

    await blog.save();
    res.status(201).json({ message: "Blog created successfully", blog });
  } catch (err) {
    console.error("Error creating blog:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all blogs by category
exports.getAllBlogs = async (req, res) => {
  try {
    const categories = ["Politics", "Movies", "Cultural", "Economics", "Cricket"];
    const blogsByCategory = await Promise.all(
      categories.map(async (category) => {
        const blogs = await Blog.find({ category, status: "published" })
          .populate("author", "fullName")
          .sort({ createdAt: -1 });
        return blogs;
      })
    );

    res.json(blogsByCategory);
  } catch (err) {
    console.error("Error fetching blogs:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get a single blog by ID
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate("author", "fullName");
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.json(blog);
  } catch (err) {
    console.error("Error fetching blog:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

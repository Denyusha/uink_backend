const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const auth = require("../middleware/auth");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "blog-images",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 1200, height: 800, crop: "limit" }],
  },
});
const upload = multer({ storage });

// POST create blog (with featured image)
router.post("/", auth, upload.single("featuredImage"), async (req, res) => {
  const { title, category, tags, content, status } = req.body;
  if (!title || !content || !category) {
    return res
      .status(400)
      .json({ message: "Title, content, and category are required." });
  }
  try {
    const featuredImage = req.file ? req.file.path : null;
    const blog = new Blog({
      title,
      category,
      tags: tags && tags.trim() !== "" ? tags.split(",").map(t => t.trim()) : [],
      content,
      status,
      featuredImage,
      author: req.user.userId,
    });
    await blog.save();
    res.status(201).json({ message: "Blog created", blog });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET published blogs grouped by categories with average ratings
router.get("/", async (req, res) => {
  try {
    const blogs = await Blog.find({ status: "published" })
      .sort({ createdAt: -1 })
      .populate("author", "fullName photo bio joined"); // add this line

    const categories = ["Politics", "Movies", "Cultural", "Economics", "Cricket"];
    
    const groupedBlogs = categories.map((cat) => {
      const blogsInCategory = blogs.filter((blog) => blog.category === cat);
      return blogsInCategory.map((blog) => {
        const avgRating = blog.ratings.length
          ? blog.ratings.reduce((sum, r) => sum + r.value, 0) / blog.ratings.length
          : 0;

        return {
          ...blog.toObject(),
          averageRating: avgRating.toFixed(1),
        };
      });
    });

    res.json(groupedBlogs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// POST add a comment to a blog
router.post("/:id/comment", auth, async (req, res) => {
  const { text } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    const comment = {
      userId: req.user.userId,
      username: req.user.username, // Make sure username is available in token or fetch from DB
      text,
    };

    blog.comments.push(comment);
    await blog.save();

    res.status(201).json({ message: "Comment added", comment });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST add a rating to a blog
router.post("/:id/rate", auth, async (req, res) => {
  const { value } = req.body;
  if (value < 1 || value > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }

  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    const existing = blog.ratings.find(
      (r) => r.userId.toString() === req.user.userId
    );
    if (existing)
      return res.status(400).json({ message: "You already rated this blog" });

    blog.ratings.push({ userId: req.user.userId, value });
    await blog.save();

    res.status(201).json({ message: "Rating submitted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET blogs created by logged-in user
router.get("/mine", auth, async (req, res) => {
  try {
    const blogs = await Blog.find({ author: req.user.userId });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Check if the logged-in user is the author
    if (blog.author.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized to delete this blog" });
    }

    await blog.deleteOne();

    res.json({ message: "Blog deleted successfully" });
  } catch (error) {
    console.error("Error deleting blog:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// GET 4 random published blogs for Featured Stories
router.get("/featured/random", async (req, res) => {
  try {
    const featuredBlogs = await Blog.aggregate([
      { $match: { status: "published" } },
      { $sample: { size: 4 } }, // randomly pick 4 blogs
      {
        $lookup: {
          from: "users", // make sure this matches your users collection
          localField: "author",
          foreignField: "_id",
          as: "authorInfo",
        },
      },
      {
        $unwind: {
          path: "$authorInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          title: 1,
          category: 1,
          featuredImage: 1,
          author: "$authorInfo.fullName",
          profile_pic: "$authorInfo.photo",
        },
      },
    ]);
    res.json(featuredBlogs);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch featured stories",
      error: error.message,
    });
  }
});

module.exports = router;

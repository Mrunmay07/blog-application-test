import express from "express";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import authMiddleware from "../middleware/authMiddleware.js";
import Blog from "../models/Blog.js";
import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

const router = express.Router();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

// Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const id = crypto.randomUUID();
    const extension = path.extname(file.originalname);
    cb(null, `${id}${extension}`);
  },
});

const upload = multer({ storage: storage });

// GET blogs
router.get("/", async (req, res) => {
  const blogs = await Blog.find();
  return res.json(blogs);
});

// GET blogs by Search
router.get("/search", async (req, res) => {
  const { s } = req.query;

  const blogs = await Blog.find({
    $or: [
      {
        title: {
          $regex: s,
          $options: "i",
        },
      },
      {
        content: {
          $regex: s,
          $options: "i",
        },
      },
    ],
  });

  return res.status(200).json(blogs);
});

// GET blogs by id
// Dynamic route
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(id);

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  return res.status(200).json(blog);
});

// Create a Blog
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { title, content, author } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({ message: "All fields are requried" });
    }

    let imageUrl = null;

    if (req.file) {
      console.log("File received", req.file);
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "blogs",
      });
      console.log(uploadResult);

      imageUrl = uploadResult.secure_url;
    }

    await Blog.create({
      title,
      content,
      author,
      userId: req.user._id,
      image: imageUrl,
    });

    return res.status(201).json({ message: "Blog created successfully" });
  } catch (error) {
    console.log(error);
    console.log(error?.message);

    return res
      .status(500)
      .json({ message: "Failed to create a blog", error: error.message });
  }
});

// Likes
router.post("/:id/likes", authMiddleware, async (req, res) => {
  const { id } = req.params;

  const blog = await Blog.findById(blog);

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  const alreadyLiked = await Blog.findById(blog.likes.userId === req.user._id);

  if (alreadyLiked) {
    return res.json({ message: "You already liked this blog" });
  }

  blog.likes.push({
    userId: req.user._id,
  });

  return res.status(201).json({ messsage: "Blog Liked" });
});

// Unlike

// update blog -> PATCH
router.patch("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  const updatedBlog = await Blog.findOneAndUpdate(
    {
      _id: id,
      userId: req.user._id,
    },
    req.body,
    {
      new: true,
    },
  );

  if (!updatedBlog) {
    return res.status(404).json({ message: "Blog not found or unauthorized" });
  }

  return res.status(201).json({ message: "Blog Updated", blog: updatedBlog });
});

// Delete a blog -> DELETE
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  const deletedBlog = await Blog.findOneAndDelete({
    _id: id,
    userId: req.user._id,
  });

  if (!deletedBlog) {
    return res.json({ message: "Blog not found or Unauthorized" });
  }

  return res.json({ message: "Blog Deleted", blog: deletedBlog });
});

// Add Comment - POST
router.post("/:id/comment", authMiddleware, async (req, res) => {
  const { id } = req.params;

  const { text } = req.body;

  if (!text) {
    return res.json({ message: "All fields are required!" });
  }

  const updatedCommentBlog = await Blog.findByIdAndUpdate(
    id,
    {
      $push: {
        comments: {
          userId: req.user._id,
          username: req.user.name,
          text,
        },
      },
    },
    {
      new: true,
    },
  );

  if (!updatedCommentBlog) {
    return res.status(404).json({ message: "Blog not found" });
  }


  return res.json({message : "Comment added" , comment : updatedCommentBlog.comments})
});

export default router;

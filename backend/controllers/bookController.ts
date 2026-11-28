import { Request, Response } from 'express';
import type { PipelineStage } from 'mongoose';
import { isMongoConnected } from '../config/db.ts';
import { generateObjectId, loadStore, runStoreTransaction } from '../config/store.ts';
import { AuthenticatedRequest } from '../middleware/authMiddleware.ts';
import { BookModel } from '../models/Book.ts';

export async function getBooks(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string | undefined)?.trim() || '';
    const category = (req.query.category as string | undefined)?.trim() || '';
    const sort = (req.query.sort as string | undefined)?.trim() || 'newest';
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit || '12'), 10) || 12));

    if (isMongoConnected()) {
      const filter: Record<string, unknown> = {};
      if (category && category !== 'All') filter.category = category;
      if (q) {
        filter.$or = [
          { title: { $regex: q, $options: 'i' } },
          { author: { $regex: q, $options: 'i' } },
          { isbn: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } },
        ];
      }

      const pipeline: PipelineStage[] = [
        { $match: filter },
        {
          $addFields: {
            numReviews: { $size: { $ifNull: ['$reviews', []] } },
            rating: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$reviews', []] } }, 0] },
                { $avg: '$reviews.rating' },
                0,
              ],
            },
          },
        },
      ];

      const sortMap: Record<string, Record<string, 1 | -1>> = {
        newest: { createdAt: -1 },
        'price-asc': { price: 1, createdAt: -1 },
        'price-desc': { price: -1, createdAt: -1 },
        rating: { rating: -1, numReviews: -1, createdAt: -1 },
      };
      pipeline.push({ $sort: sortMap[sort] || sortMap.newest });

      const countPipeline = [...pipeline.slice(0, 2), { $count: 'total' }];
      const countResult = await BookModel.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
      const books = await BookModel.aggregate(pipeline);
      const categories = await BookModel.distinct('category');
      res.json({
        books,
        categories,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
      return;
    }

    const db = loadStore();
    const categories = Array.from(new Set(db.books.map((b) => b.category)));
    let filtered = [...db.books];

    if (category && category !== 'All') filtered = filtered.filter((b) => b.category === category);
    if (q) {
      const needle = q.toLowerCase();
      filtered = filtered.filter((b) =>
        [b.title, b.author, b.isbn, b.category].some((value) => value.toLowerCase().includes(needle))
      );
    }

    filtered = filtered.map((book) => {
      const numReviews = book.reviews.length;
      const rating = numReviews
        ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / numReviews
        : 0;
      return { ...book, rating, numReviews };
    });

    if (sort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      filtered.sort((a, b) =>
        (b.numReviews === 0 ? -1 : b.rating) - (a.numReviews === 0 ? -1 : a.rating) ||
        b.numReviews - a.numReviews
      );
    } else {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = filtered.length;
    const paged = filtered.slice((page - 1) * limit, page * limit);
    res.json({
      books: paged,
      categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || 'Failed to fetch books.' });
  }
}

export async function getBookById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      const book = await BookModel.findById(id);
      if (!book) {
        res.status(404).json({ message: 'Book not found.' });
        return;
      }
      res.json({ book });
      return;
    }

    const db = loadStore();
    const book = db.books.find((b) => b._id === id);
    if (!book) {
      res.status(404).json({ message: 'Book not found.' });
      return;
    }
    res.json({ book });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message || 'Failed to load book details.' });
  }
}

export async function addBookReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Please sign in to post a review.' });
      return;
    }

    const { id } = req.params;
    const { rating, comment } = req.body as { rating?: number; comment?: string };

    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5 stars.' });
      return;
    }
    if (!comment || comment.trim().length < 4) {
      res.status(400).json({ message: 'Please write a brief review (at least 4 characters).' });
      return;
    }

    if (isMongoConnected()) {
      const book = await BookModel.findById(id);
      if (!book) {
        res.status(404).json({ message: 'Book not found.' });
        return;
      }

      const existingIdx = book.reviews.findIndex(
        (r) => r.user.toString() === req.user!.id
      );

      if (existingIdx >= 0) {
        book.reviews[existingIdx].rating = Number(rating);
        book.reviews[existingIdx].comment = comment.trim();
        book.reviews[existingIdx].createdAt = new Date();
      } else {
        book.reviews.push({
          user: req.user.id,
          name: req.user.name,
          rating: Number(rating),
          comment: comment.trim(),
          createdAt: new Date(),
        });
      }

      book.numReviews = book.reviews.length;
      book.rating = book.numReviews
        ? Number((book.reviews.reduce((sum, item) => sum + item.rating, 0) / book.numReviews).toFixed(1))
        : 0;
      await book.save();
      res.status(201).json({ book });
      return;
    }

    const updatedBook = await runStoreTransaction((db) => {
      const book = db.books.find((b) => b._id === id);
      if (!book) {
        const err = new Error('Book not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }

      const existingIdx = book.reviews.findIndex((r) => r.user === req.user!.id);
      const nowIso = new Date().toISOString();

      if (existingIdx >= 0) {
        book.reviews[existingIdx].rating = Number(rating);
        book.reviews[existingIdx].comment = comment.trim();
        book.reviews[existingIdx].createdAt = nowIso;
      } else {
        book.reviews.push({
          _id: generateObjectId(),
          user: req.user!.id,
          name: req.user!.name,
          rating: Number(rating),
          comment: comment.trim(),
          createdAt: nowIso,
        });
      }

      book.numReviews = book.reviews.length;
      book.rating = Number(
        (book.reviews.reduce((sum, item) => sum + item.rating, 0) / book.reviews.length).toFixed(1)
      );
      book.updatedAt = nowIso;
      return book;
    });

    res.status(201).json({ book: updatedBook });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to submit review.' });
  }
}

export async function createBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      title,
      author,
      isbn,
      description,
      price,
      stockCount,
      category,
      coverImageUrl,
      publisher,
      language,
      pages,
    } = req.body;

    if (!title || !author || !isbn || !description || price === undefined || !category) {
      res.status(400).json({ message: 'Title, author, ISBN, description, price, and category are required.' });
      return;
    }

    const uploadedCover = req.file ? `/uploads/covers/${req.file.filename}` : undefined;
    const finalCover = uploadedCover || coverImageUrl?.trim();
    if (!finalCover) {
      const err = new Error('A real book-cover image is required.') as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    if (isMongoConnected()) {
      const book = await BookModel.create({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        description: description.trim(),
        price: Number(price),
        stockCount: Number(stockCount ?? 0),
        category: category.trim(),
        coverImageUrl: finalCover,
        publisher: publisher?.trim() || 'BookHaven Editions',
        language: language?.trim() || 'English / Myanmar',
        pages: Number(pages ?? 240),
      });
      res.status(201).json({ book });
      return;
    }

    const created = await runStoreTransaction((db) => {
      if (db.books.some((b) => b.isbn.toLowerCase() === String(isbn).trim().toLowerCase())) {
        const err = new Error('A book with this ISBN already exists.') as Error & { status?: number };
        err.status = 409;
        throw err;
      }
      const nowIso = new Date().toISOString();
      const newBook = {
        _id: generateObjectId(),
        title: String(title).trim(),
        author: String(author).trim(),
        isbn: String(isbn).trim(),
        description: String(description).trim(),
        price: Number(price),
        stockCount: Math.max(0, Number(stockCount ?? 0)),
        category: String(category).trim(),
        coverImageUrl: finalCover,
        publisher: publisher?.trim() || 'BookHaven Editions',
        language: language?.trim() || 'English / Myanmar',
        pages: Number(pages ?? 240),
        reviews: [],
        rating: 0,
        numReviews: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      db.books.unshift(newBook);
      return newBook;
    });

    res.status(201).json({ book: created });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to create book.' });
  }
}

export async function updateBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;
    const uploadedCover = req.file ? `/uploads/covers/${req.file.filename}` : undefined;
    if (uploadedCover) updates.coverImageUrl = uploadedCover;

    if (isMongoConnected()) {
      const book = await BookModel.findById(id);
      if (!book) {
        res.status(404).json({ message: 'Book not found.' });
        return;
      }
      if (updates.title !== undefined) book.title = String(updates.title).trim();
      if (updates.author !== undefined) book.author = String(updates.author).trim();
      if (updates.isbn !== undefined) book.isbn = String(updates.isbn).trim();
      if (updates.description !== undefined) book.description = String(updates.description).trim();
      if (updates.price !== undefined) book.price = Math.max(0, Number(updates.price));
      if (updates.stockCount !== undefined) book.stockCount = Math.max(0, Number(updates.stockCount));
      if (updates.category !== undefined) book.category = String(updates.category).trim();
      if (updates.coverImageUrl !== undefined) book.coverImageUrl = String(updates.coverImageUrl).trim();
      if (updates.publisher !== undefined) book.publisher = String(updates.publisher).trim();
      if (updates.language !== undefined) book.language = String(updates.language).trim();
      if (updates.pages !== undefined) book.pages = Math.max(1, Number(updates.pages));
      await book.save();
      res.json({ book });
      return;
    }

    const updated = await runStoreTransaction((db) => {
      const book = db.books.find((b) => b._id === id);
      if (!book) {
        const err = new Error('Book not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      if (updates.title !== undefined) book.title = String(updates.title).trim();
      if (updates.author !== undefined) book.author = String(updates.author).trim();
      if (updates.isbn !== undefined) book.isbn = String(updates.isbn).trim();
      if (updates.description !== undefined) book.description = String(updates.description).trim();
      if (updates.price !== undefined) book.price = Math.max(0, Number(updates.price));
      if (updates.stockCount !== undefined) book.stockCount = Math.max(0, Number(updates.stockCount));
      if (updates.category !== undefined) book.category = String(updates.category).trim();
      if (updates.coverImageUrl !== undefined) {
        const uploadedCover = req.file ? `/uploads/covers/${req.file.filename}` : undefined;
        if (uploadedCover) updates.coverImageUrl = uploadedCover;
        book.coverImageUrl = String(updates.coverImageUrl).trim();
      }
      if (updates.publisher !== undefined) book.publisher = String(updates.publisher).trim();
      if (updates.language !== undefined) book.language = String(updates.language).trim();
      if (updates.pages !== undefined) book.pages = Math.max(1, Number(updates.pages));
      book.updatedAt = new Date().toISOString();
      return book;
    });

    res.json({ book: updated });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to update book.' });
  }
}

export async function deleteBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (isMongoConnected()) {
      const deleted = await BookModel.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ message: 'Book not found.' });
        return;
      }
      res.json({ message: 'Book removed from catalog.' });
      return;
    }

    await runStoreTransaction((db) => {
      const idx = db.books.findIndex((b) => b._id === id);
      if (idx === -1) {
        const err = new Error('Book not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }
      db.books.splice(idx, 1);
    });

    res.json({ message: 'Book removed from catalog.' });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to delete book.' });
  }
}

export async function deleteBookReview(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;

    if (isMongoConnected()) {
      const book = await BookModel.findById(id);
      if (!book) {
        res.status(404).json({ message: 'Book not found.' });
        return;
      }

      const reviewIndex = book.reviews.findIndex((review) => review.user.toString() === req.user!.id);
      if (reviewIndex === -1) {
        res.status(404).json({ message: 'Review not found.' });
        return;
      }

      book.reviews.splice(reviewIndex, 1);
      book.numReviews = book.reviews.length;
      book.rating = book.numReviews
        ? book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.numReviews
        : 0;
      await book.save();
      res.json({ book });
      return;
    }

    const updatedBook = await runStoreTransaction((db) => {
      const book = db.books.find((item) => item._id === id);
      if (!book) {
        const err = new Error('Book not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }

      const reviewIndex = book.reviews.findIndex((review) => review.user === req.user!.id);
      if (reviewIndex === -1) {
        const err = new Error('Review not found.') as Error & { status?: number };
        err.status = 404;
        throw err;
      }

      book.reviews.splice(reviewIndex, 1);
      book.numReviews = book.reviews.length;
      book.rating = book.numReviews
        ? Number((book.reviews.reduce((sum, review) => sum + review.rating, 0) / book.numReviews).toFixed(1))
        : 0;
      book.updatedAt = new Date().toISOString();
      return book;
    });

    res.json({ book: updatedBook });
  } catch (err) {
    const error = err as Error & { status?: number };
    res.status(error.status || 500).json({ message: error.message || 'Failed to delete review.' });
  }
}

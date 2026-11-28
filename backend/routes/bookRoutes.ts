import { Router } from 'express';
import {
  addBookReview,
  createBook,
  deleteBook,
  deleteBookReview,
  getBookById,
  getBooks,
  updateBook,
} from '../controllers/bookController.ts';
import { adminOnly, protect } from '../middleware/authMiddleware.ts';
import { uploadBookCover } from '../middleware/uploadMiddleware.ts';

const router = Router();

router.get('/', getBooks);
router.get('/:id', getBookById);
router.post('/:id/reviews', protect, addBookReview);
router.delete('/:id/reviews', protect, deleteBookReview);
router.post('/', protect, adminOnly, uploadBookCover.single('cover'), createBook);
router.put('/:id', protect, adminOnly, uploadBookCover.single('cover'), updateBook);
router.delete('/:id', protect, adminOnly, deleteBook);

export default router;

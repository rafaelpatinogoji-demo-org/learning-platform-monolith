import { Router } from 'express';

// Import all domain routers
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import coursesRoutes from './courses.routes';
import lessonsRoutes from './lessons.routes';
import enrollmentsRoutes from './enrollments.routes';
import progressRoutes from './progress.routes';
import quizzesRoutes from './quizzes.routes';
import certificatesRoutes from './certificates.routes';
import notificationsRoutes from './notifications.routes';

const router = Router();

// Mount all domain routers
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/courses', coursesRoutes);
router.use('/lessons', lessonsRoutes);
router.use('/enrollments', enrollmentsRoutes);
router.use('/progress', progressRoutes);
router.use('/quizzes', quizzesRoutes);
router.use('/certificates', certificatesRoutes);
router.use('/notifications', notificationsRoutes);

export default router;

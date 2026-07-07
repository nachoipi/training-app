// Public media-proxy routes. Sit OUTSIDE requireAuth because they're used
// directly as <img src> URLs from the browser (which can't send Bearer
// tokens). The underlying upstream resource must already be public on its
// side — see the controller for the safety story.
import { Router } from 'express';
import { driveThumbnail } from '../controllers/mediaProxy.controller.js';

const router = Router();
router.get('/drive-thumb', driveThumbnail);

export default router;

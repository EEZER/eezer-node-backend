import express from 'express';
import bodyParser from 'body-parser';
import mongoSanitize from 'express-mongo-sanitize';
import jwt from 'express-jwt';

import routes from './src/routes/routes';
import adminRoutes from './src/routes/admin-routes';
import transportRoutes from './src/routes/transport-routes';
import userRoutes from './src/routes/user-routes';
import vehicleRoutes from './src/routes/vehicle-routes';

import db from './src/db/db';
import getConfig from './src/config/config';
import middlewares from './src/middlewares/middlewares';

import {
  // transport
  API_PATH_STORE, API_PATH_ALL, API_PATH_COORDS, API_PATH_REMOVE,
  // admin
  API_PATH_EXPORT,
  API_PATH_LOGIN,
  // user
  API_PATH_ADD_USER, API_PATH_DELETE_USERS, API_PATH_GET_USERS,
  // vehicles
  API_PATH_ADD_VEHICLE, API_PATH_DELETE_VEHICLE, API_PATH_GET_VEHICLES,
  // whitelisted URLs
  URL_WHITELIST
} from './src/config/constants';

// Don't load the .env file in production.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

console.log(`Starting Eezer API server.`);
const app = express();
const config = getConfig();

console.log(`NODE_ENV=${process.env.NODE_ENV}`);

/* Connect to mongodb */
console.log(`MONGODB_URL=${config.dbUrl}`);
db.connect();

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(middlewares.cors);

/* Sanitize data before inserting into mongo */
app.use(mongoSanitize());

/* Use authentication middleware to secure rotes
 * Note: Some routes require no authentication, such as login etc.
 * That routes are configured in the URL_WHITELIST array in constants.js.
 */
app.use(jwt({ secret: config.JWT_SECRET }).unless({ path: URL_WHITELIST }), middlewares.auth);

const port = process.env.PORT || config.defaultPort;
const router = express.Router();

/* Set up other middlewares */
router.use(middlewares.default);

/* Set up admin role checks for some routes */

// users
router.post(`/${API_PATH_ADD_USER}`, middlewares.adminCheck);
router.delete(`/${API_PATH_DELETE_USERS}/:username`, middlewares.adminCheck);
router.get(`/${API_PATH_GET_USERS}`, middlewares.adminCheck);

// vehicles
router.post(`/${API_PATH_ADD_VEHICLE}`, middlewares.adminCheck);
router.delete(`/${API_PATH_DELETE_VEHICLE}`, middlewares.adminCheck);
router.get(`/${API_PATH_GET_VEHICLES}`, middlewares.adminCheck);

// transports
router.delete(`/${API_PATH_REMOVE}/:id`, middlewares.adminCheck);

// --------------------------------------------------------------- //

/* Set up routes */
router.get('/', routes.root);

/* Set up some admin routes (such as login) */
router.route(`/${API_PATH_EXPORT}`).get(adminRoutes.export);
router.route(`/${API_PATH_LOGIN}`).post(adminRoutes.login);

/* Set up root transport routes */
router.route(`/${API_PATH_STORE}`).post(transportRoutes.storeTransport);
router.route(`/${API_PATH_ALL}`).get(transportRoutes.getAll);
router.route(`/${API_PATH_COORDS}/:id`).get(transportRoutes.getCoordinates);
router.route(`/${API_PATH_REMOVE}/:id`).delete(transportRoutes.removeTransport);

/* Set up user routes */
router.route(`/${API_PATH_ADD_USER}`).post(userRoutes.addUser);
router.route(`/${API_PATH_DELETE_USERS}/:username`).delete(userRoutes.deleteUser);
router.route(`/${API_PATH_GET_USERS}`).get(userRoutes.getUsers);

/* Set up vehicle routes */
router.route(`/${API_PATH_ADD_VEHICLE}`).post(vehicleRoutes.addVehicle);
router.route(`/${API_PATH_DELETE_VEHICLE}`).delete(vehicleRoutes.deleteVehicle);
router.route(`/${API_PATH_GET_VEHICLES}`).get(vehicleRoutes.getVehicles);

/* Set base url for api endpoint */
app.use(config.apiRootEndpoint, router);

app.listen(port);

console.log(`Server is listening on port ${port}`);

// Export the app for testing.
module.exports = app;

'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shop.controller');

router.get('/health', ctrl.health);
router.get('/products', ctrl.getProducts);
router.get('/products/:id', ctrl.getProduct);
router.get('/categories', ctrl.getCategories);
router.post('/coupons/validate', ctrl.validateCoupon);
router.post('/orders/checkout', ctrl.checkout);
router.get('/orders/:id', ctrl.getOrder);

module.exports = router;

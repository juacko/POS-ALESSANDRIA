/**
 * Product Model
 * Handles all product and modifier data operations
 */

/**
 * Gets all active products
 * @returns {Array<Object>} Array of active product objects
 */
function getProducts() {
  try {
    var allProducts = getSheetData(CONFIG.SHEETS.PRODUCTS);
    var activeProducts = [];
    
    for (var i = 0; i < allProducts.length; i++) {
      if (allProducts[i].active === true || allProducts[i].active === 'TRUE') {
        activeProducts.push(allProducts[i]);
      }
    }
    
    return activeProducts;
  } catch (e) {
    logError('getProducts', e);
    throw e;
  }
}

/**
 * Gets all modifiers
 * @returns {Array<Object>} Array of modifier objects
 */
function getModifiers() {
  try {
    return getSheetData(CONFIG.SHEETS.MODIFIERS);
  } catch (e) {
    logError('getModifiers', e);
    throw e;
  }
}

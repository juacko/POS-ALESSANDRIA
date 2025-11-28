/**
 * backend_models_Products.gs
 * Data access for Products and Modifiers.
 */

/**
 * Gets all active products.
 */
function getProducts() {
  const allProducts = getSheetData("Products");
  return allProducts.filter((p) => p.active === true);
}

/**
 * Gets all modifiers.
 */
function getModifiers() {
  return getSheetData("Modifiers");
}

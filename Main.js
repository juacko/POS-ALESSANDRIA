/**
 * Main entry point for the web application
 * This function is called when the web app is accessed
 */
function doGet() {
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('MIN MIN HELADERIA - POS')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include function for loading HTML partials
 * Used by index.html to load styles, scripts, and components
 */
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get initial data for the application
 * Called when the app loads
 */
function getInitialData() {
    var response = {
        success: true,
        products: [],
        modifiers: [],
        tables: [],
        paymentMethods: [],
        activeSession: null,
        errors: []
    };

    try {
        try {
            response.products = getProducts();
        } catch (e) {
            Logger.log('Error getting products: ' + e);
            response.errors.push('Productos: ' + e.message);
        }

        try {
            response.modifiers = getModifiers();
        } catch (e) {
            Logger.log('Error getting modifiers: ' + e);
            response.errors.push('Modificadores: ' + e.message);
        }

        try {
            response.tables = getTables();
        } catch (e) {
            Logger.log('Error getting tables: ' + e);
            response.errors.push('Mesas: ' + e.message);
        }

        try {
            response.paymentMethods = getPaymentMethods();
        } catch (e) {
            Logger.log('Error getting payment methods: ' + e);
            response.errors.push('Métodos de pago: ' + e.message);
        }

        try {
            response.activeSession = getActiveCashierSession();
        } catch (e) {
            Logger.log('Error getting active session: ' + e);
            // Session error is not critical for loading the app
        }

        return response;

    } catch (e) {
        Logger.log('Critical error in getInitialData: ' + e);
        return { success: false, error: e.toString() };
    }
}

/**
 * backend_controllers_Orders.gs
 * Logic for Orders and Main Application Data.
 */

/**
 * Obtiene todos los datos iniciales que necesita la aplicación para arrancar.
 */
function getInitialData() {
  try {
    return {
      success: true,
      products: getProducts(),
      modifiers: getModifiers(),
      tables: getTables(),
      activeSession: getActiveCashierSession(),
      paymentMethods: getPaymentMethods()
    };
  } catch (e) {
    Logger.log('Error in getInitialData: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Finalizes an order by recording payments and updating statuses.
 */
function finalizeOrderAndPay(orderId, payments, totalAmount) {
  try {
    const activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa.');
    }

    const paymentsToCreate = payments.map(p => ({
      ...p,
      order_id: orderId,
      session_id: activeSession.session_id
    }));

    createPayments(paymentsToCreate);

    const orderUpdateData = {
      status: 'Paid',
      total_amount: totalAmount
    };
    const updatedOrder = updateOrder(orderId, orderUpdateData);

    if (updatedOrder && updatedOrder.table_number) {
      updateTableStatus(updatedOrder.table_number, 'Disponible');
    } else {
      Logger.log('Advertencia: No se pudo actualizar el estado de la mesa para la orden ' + orderId);
    }

    return { success: true };

  } catch (e) {
    Logger.log('Error in finalizeOrderAndPay: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Checks for an open order on a table or creates a new one.
 */
function getOrCreateTableOrder(tableId) {
  try {
    const activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('Caja cerrada. Por favor, abra una sesión para poder iniciar un nuevo pedido.');
    }

    let order;
    let items = [];
    const openOrder = getOpenOrderByTable(tableId);

    if (openOrder) {
      order = openOrder;
      items = getOrderItemsByOrderId(order.order_id);
    } else {
      const newOrderId = createOrder(tableId);
      order = { order_id: newOrderId, table_number: tableId, status: 'Open' };
    }

    return { success: true, orderId: order.order_id, items: items };

  } catch (e) {
    Logger.log('Error in getOrCreateTableOrder: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Guarda los artículos de un pedido.
 */
function saveOrderItems(orderId, items) {
  try {
    overwriteOrderItems(orderId, items);
    const updatedItems = getOrderItemsByOrderId(orderId);
    return { success: true, items: updatedItems };
  } catch (e) {
    Logger.log('Error in saveOrderItems: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Frees up a table by deleting the associated empty order and updating the table status.
 */
function forceFreeUpTable(tableId, orderId) {
  try {
    deleteOrderItemsByOrderId(orderId);
    deleteOrder(orderId);
    updateTableStatus(tableId, 'Disponible');

    return { success: true };
  } catch (e) {
    Logger.log('Error in forceFreeUpTable: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Obtiene las órdenes activas para mostrar en la vista.
 * @returns {Object} Resultado con las órdenes activas o error.
 */
function getActiveOrdersData() {
  try {
    Logger.log('getActiveOrdersData: Iniciando...');
    const activeOrders = getActiveOrders();
    Logger.log('getActiveOrdersData: Órdenes encontradas: ' + activeOrders.length);
    return { success: true, orders: activeOrders };
  } catch (e) {
    Logger.log('Error en getActiveOrdersData: ' + e.toString());
    Logger.log('Stack trace: ' + e.stack);
    return { success: false, error: e.toString() };
  }
}

/**
 * Obtiene el historial de órdenes pagadas.
 * @returns {Object} Resultado con el historial de órdenes o error.
 */
function getPaidOrdersHistory() {
  try {
    Logger.log('getPaidOrdersHistory: Iniciando...');
    const paidOrders = getPaidOrders();
    Logger.log('getPaidOrdersHistory: Órdenes pagadas encontradas: ' + paidOrders.length);
    return { success: true, orders: paidOrders };
  } catch (e) {
    Logger.log('Error en getPaidOrdersHistory: ' + e.toString());
    Logger.log('Stack trace: ' + e.stack);
    return { success: false, error: e.toString() };
  }
}

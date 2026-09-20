const Tariff = require('../models/Tariff');

/**
 * Service to fetch the appropriate tariff for a consumer or connection type.
 */
class TariffService {
  /**
   * Resolves tariff for a consumer. If consumer has an assigned tariff, use it;
   * otherwise, retrieve the default tariff for that connection type (Electricity/Water).
   *
   * @param {Object} consumer - Consumer Mongoose document
   * @returns {Promise<Object>} Tariff document
   */
  static async getTariffForConsumer(consumer) {
    if (consumer && consumer.tariffId) {
      const assigned = await Tariff.findById(consumer.tariffId);
      if (assigned) return assigned;
    }

    const connectionType = consumer?.connectionType || 'Electricity';
    
    // Find default tariff for this connection type
    let tariff = await Tariff.findOne({ connectionType, isDefault: true });
    if (!tariff) {
      tariff = await Tariff.findOne({ connectionType });
    }

    // Ultimate fallback if no tariff exists in DB
    if (!tariff) {
      tariff = await Tariff.create({
        name: `Default ${connectionType} Tariff`,
        connectionType,
        slabs: [
          { from: 0, to: 100, rate: connectionType === 'Electricity' ? 3 : 2 },
          { from: 101, to: 200, rate: connectionType === 'Electricity' ? 5 : 4 },
          { from: 201, to: 500, rate: connectionType === 'Electricity' ? 7 : 6 },
          { from: 501, to: null, rate: connectionType === 'Electricity' ? 10 : 8 }
        ],
        fixedCharge: connectionType === 'Electricity' ? 100 : 50,
        isDefault: true
      });
    }

    return tariff;
  }
}

module.exports = TariffService;

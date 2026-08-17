// =============================================================================
// consumer-mobile — Order Models
// Authoritative models for consumer orders and price snapshots
// =============================================================================

class OrderModel {
  final String id;
  final String userId;
  final String eventId;
  final String status;
  final int subtotalMinor;
  final int feesMinor;
  final int taxMinor;
  final int discountMinor;
  final int totalMinor;
  final String currency;
  final String? idempotencyKey;
  final DateTime createdAt;
  final DateTime updatedAt;

  const OrderModel({
    required this.id,
    required this.userId,
    required this.eventId,
    required this.status,
    required this.subtotalMinor,
    required this.feesMinor,
    required this.taxMinor,
    required this.discountMinor,
    required this.totalMinor,
    required this.currency,
    this.idempotencyKey,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      eventId: json['eventId'] as String,
      status: json['status'] as String,
      subtotalMinor: (json['subtotalMinor'] as num).toInt(),
      feesMinor: (json['feesMinor'] as num).toInt(),
      taxMinor: (json['taxMinor'] as num).toInt(),
      discountMinor: (json['discountMinor'] as num).toInt(),
      totalMinor: (json['totalMinor'] as num).toInt(),
      currency: json['currency'] as String? ?? 'INR',
      idempotencyKey: json['idempotencyKey'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  bool get isPaid => status == 'paid' || status == 'completed';
  bool get isPending => status == 'created' || status == 'payment_pending' || status == 'pending';
}

class OrderItemModel {
  final String id;
  final String orderId;
  final String ticketTypeId;
  final int quantity;
  final int unitPriceMinor;
  final int totalMinor;

  const OrderItemModel({
    required this.id,
    required this.orderId,
    required this.ticketTypeId,
    required this.quantity,
    required this.unitPriceMinor,
    required this.totalMinor,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id'] as String,
      orderId: json['orderId'] as String,
      ticketTypeId: json['ticketTypeId'] as String,
      quantity: (json['quantity'] as num).toInt(),
      unitPriceMinor: (json['unitPriceMinor'] as num).toInt(),
      totalMinor: (json['totalMinor'] as num).toInt(),
    );
  }
}

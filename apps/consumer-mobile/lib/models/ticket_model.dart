// =============================================================================
// consumer-mobile — Ticket Models
// Authoritative models for digital tickets and ticket tiers
// =============================================================================

class TicketModel {
  final String id;
  final String orderId;
  final String orderItemId;
  final String ticketTypeId;
  final String eventId;
  final String userId;
  final String ticketNumber;
  final String status;
  final String qrTokenHash;
  final String? qrToken;
  final DateTime issuedAt;
  final DateTime? checkedInAt;
  final DateTime? voidedAt;

  const TicketModel({
    required this.id,
    required this.orderId,
    required this.orderItemId,
    required this.ticketTypeId,
    required this.eventId,
    required this.userId,
    required this.ticketNumber,
    required this.status,
    required this.qrTokenHash,
    this.qrToken,
    required this.issuedAt,
    this.checkedInAt,
    this.voidedAt,
  });

  factory TicketModel.fromJson(Map<String, dynamic> json) {
    return TicketModel(
      id: json['id'] as String,
      orderId: json['orderId'] as String,
      orderItemId: json['orderItemId'] as String,
      ticketTypeId: json['ticketTypeId'] as String,
      eventId: json['eventId'] as String,
      userId: json['userId'] as String,
      ticketNumber: json['ticketNumber'] as String,
      status: json['status'] as String,
      qrTokenHash: json['qrTokenHash'] as String,
      qrToken: json['qrToken'] as String?,
      issuedAt: DateTime.parse(json['issuedAt'] as String),
      checkedInAt: json['checkedInAt'] != null
          ? DateTime.parse(json['checkedInAt'] as String)
          : null,
      voidedAt: json['voidedAt'] != null
          ? DateTime.parse(json['voidedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'orderItemId': orderItemId,
      'ticketTypeId': ticketTypeId,
      'eventId': eventId,
      'userId': userId,
      'ticketNumber': ticketNumber,
      'status': status,
      'qrTokenHash': qrTokenHash,
      'qrToken': qrToken,
      'issuedAt': issuedAt.toIso8601String(),
      'checkedInAt': checkedInAt?.toIso8601String(),
      'voidedAt': voidedAt?.toIso8601String(),
    };
  }

  bool get isValid => status == 'issued';
  bool get isCheckedIn => status == 'checked_in';
}

class TicketTypeModel {
  final String id;
  final String eventId;
  final String name;
  final String? description;
  final int priceMinor;
  final String currency;
  final int quantity;
  final int soldQuantity;
  final int reservedQuantity;
  final int minPerOrder;
  final int maxPerOrder;
  final String status;

  const TicketTypeModel({
    required this.id,
    required this.eventId,
    required this.name,
    this.description,
    required this.priceMinor,
    required this.currency,
    required this.quantity,
    required this.soldQuantity,
    required this.reservedQuantity,
    required this.minPerOrder,
    required this.maxPerOrder,
    required this.status,
  });

  factory TicketTypeModel.fromJson(Map<String, dynamic> json) {
    return TicketTypeModel(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      priceMinor: (json['priceMinor'] as num).toInt(),
      currency: json['currency'] as String? ?? 'INR',
      quantity: (json['quantity'] as num).toInt(),
      soldQuantity: (json['soldQuantity'] as num?)?.toInt() ?? 0,
      reservedQuantity: (json['reservedQuantity'] as num?)?.toInt() ?? 0,
      minPerOrder: (json['minPerOrder'] as num?)?.toInt() ?? 1,
      maxPerOrder: (json['maxPerOrder'] as num?)?.toInt() ?? 10,
      status: json['status'] as String? ?? 'active',
    );
  }

  int get availableQuantity => quantity - soldQuantity - reservedQuantity;
  bool get isSoldOut => availableQuantity <= 0 || status != 'active';
}

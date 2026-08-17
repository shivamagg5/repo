// =============================================================================
// consumer-mobile — Reservation Model
// Authoritative models for atomic inventory reservations & holds
// =============================================================================

class ReservationModel {
  final String reservationId;
  final String orderId;
  final String ticketTypeId;
  final String? eventId;
  final int quantity;
  final DateTime expiresAt;
  final int subtotalMinor;
  final int feesMinor;
  final int totalMinor;
  final String currency;

  const ReservationModel({
    required this.reservationId,
    required this.orderId,
    required this.ticketTypeId,
    this.eventId,
    required this.quantity,
    required this.expiresAt,
    required this.subtotalMinor,
    required this.feesMinor,
    required this.totalMinor,
    required this.currency,
  });

  factory ReservationModel.fromJson(Map<String, dynamic> json) {
    return ReservationModel(
      reservationId: json['reservationId'] as String,
      orderId: json['orderId'] as String,
      ticketTypeId: json['ticketTypeId'] as String,
      eventId: json['eventId'] as String?,
      quantity: (json['quantity'] as num).toInt(),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      subtotalMinor: (json['subtotalMinor'] as num).toInt(),
      feesMinor: (json['feesMinor'] as num).toInt(),
      totalMinor: (json['totalMinor'] as num).toInt(),
      currency: json['currency'] as String? ?? 'INR',
    );
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
  int get remainingSeconds => isExpired ? 0 : expiresAt.difference(DateTime.now()).inSeconds;
}

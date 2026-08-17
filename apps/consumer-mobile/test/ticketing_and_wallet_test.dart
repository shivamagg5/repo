// =============================================================================
// consumer-mobile — Ticketing, Checkout & Wallet Unit Tests
// Verifies models, server-authoritative pricing, and secure offline serialization
// =============================================================================

import 'package:flutter_test/flutter_test.dart';
import 'package:consumer_mobile/models/ticket_model.dart';
import 'package:consumer_mobile/models/order_model.dart';
import 'package:consumer_mobile/models/reservation_model.dart';

void main() {
  group('TicketModel & TicketTypeModel', () {
    test('correctly parses TicketModel JSON with signed qrToken', () {
      final json = {
        'id': 'tkt-1234-uuid',
        'orderId': 'ord-5678-uuid',
        'orderItemId': 'item-9999-uuid',
        'ticketTypeId': 'type-1111-uuid',
        'eventId': 'event-2222-uuid',
        'userId': 'user-3333-uuid',
        'ticketNumber': 'TKT-20260814-A1B2',
        'status': 'issued',
        'qrTokenHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'qrToken': 'TICKET.v1|tkt-1234-uuid|event-2222-uuid|type-1111-uuid|2026-08-14T10:00:00.000Z|none|v1-2026.mockSig',
        'issuedAt': '2026-08-14T10:00:00.000Z',
        'checkedInAt': null,
        'voidedAt': null,
      };

      final ticket = TicketModel.fromJson(json);

      expect(ticket.id, 'tkt-1234-uuid');
      expect(ticket.ticketNumber, 'TKT-20260814-A1B2');
      expect(ticket.status, 'issued');
      expect(ticket.isValid, isTrue);
      expect(ticket.isCheckedIn, isFalse);
      expect(ticket.qrToken, contains('TICKET.v1|tkt-1234-uuid'));

      // Test toJson roundtrip for encrypted offline storage
      final serialized = ticket.toJson();
      final roundtripped = TicketModel.fromJson(serialized);
      expect(roundtripped.id, ticket.id);
      expect(roundtripped.qrToken, ticket.qrToken);
    });

    test('correctly calculates TicketTypeModel availability without overselling', () {
      final json = {
        'id': 'type-vip',
        'eventId': 'event-100',
        'name': 'VIP Pass',
        'priceMinor': 149900,
        'currency': 'INR',
        'quantity': 100,
        'soldQuantity': 80,
        'reservedQuantity': 15,
        'minPerOrder': 1,
        'maxPerOrder': 4,
        'status': 'active',
      };

      final tier = TicketTypeModel.fromJson(json);

      expect(tier.availableQuantity, 5); // 100 - 80 - 15 = 5
      expect(tier.isSoldOut, isFalse);
      expect(tier.priceMinor, 149900);
      expect(tier.currency, 'INR');
    });

    test('identifies sold out TicketTypeModel when capacity reached', () {
      final json = {
        'id': 'type-ga',
        'eventId': 'event-100',
        'name': 'GA Pass',
        'priceMinor': 49900,
        'currency': 'INR',
        'quantity': 50,
        'soldQuantity': 45,
        'reservedQuantity': 5,
        'minPerOrder': 1,
        'maxPerOrder': 10,
        'status': 'active',
      };

      final tier = TicketTypeModel.fromJson(json);

      expect(tier.availableQuantity, 0); // 50 - 45 - 5 = 0
      expect(tier.isSoldOut, isTrue);
    });
  });

  group('ReservationModel & Hold Timer', () {
    test('parses server-authoritative reservation hold data', () {
      final expiresAt = DateTime.now().add(const Duration(minutes: 10)).toIso8601String();
      final json = {
        'reservationId': 'res-uuid-1',
        'orderId': 'ord-uuid-1',
        'ticketTypeId': 'type-uuid-1',
        'quantity': 2,
        'expiresAt': expiresAt,
        'subtotalMinor': 99800,
        'feesMinor': 0,
        'totalMinor': 99800,
        'currency': 'INR',
      };

      final reservation = ReservationModel.fromJson(json);

      expect(reservation.reservationId, 'res-uuid-1');
      expect(reservation.orderId, 'ord-uuid-1');
      expect(reservation.quantity, 2);
      expect(reservation.totalMinor, 99800);
      expect(reservation.isExpired, isFalse);
      expect(reservation.remainingSeconds, greaterThan(500));
    });

    test('detects expired reservation accurately based on server expiresAt', () {
      final pastExpiresAt = DateTime.now().subtract(const Duration(seconds: 10)).toIso8601String();
      final json = {
        'reservationId': 'res-uuid-expired',
        'orderId': 'ord-uuid-expired',
        'ticketTypeId': 'type-uuid-1',
        'quantity': 1,
        'expiresAt': pastExpiresAt,
        'subtotalMinor': 49900,
        'feesMinor': 0,
        'totalMinor': 49900,
        'currency': 'INR',
      };

      final reservation = ReservationModel.fromJson(json);

      expect(reservation.isExpired, isTrue);
      expect(reservation.remainingSeconds, 0);
    });
  });

  group('OrderModel & Price Snapshot', () {
    test('parses order price breakdown strictly from server minor units', () {
      final json = {
        'id': 'ord-998877',
        'userId': 'user-111',
        'eventId': 'event-222',
        'status': 'paid',
        'subtotalMinor': 100000,
        'feesMinor': 5000,
        'taxMinor': 18000,
        'discountMinor': 10000,
        'totalMinor': 113000,
        'currency': 'INR',
        'idempotencyKey': 'idemp-12345',
        'createdAt': '2026-08-14T12:00:00.000Z',
        'updatedAt': '2026-08-14T12:05:00.000Z',
      };

      final order = OrderModel.fromJson(json);

      expect(order.id, 'ord-998877');
      expect(order.status, 'paid');
      expect(order.isPaid, isTrue);
      expect(order.isPending, isFalse);
      expect(order.subtotalMinor, 100000);
      expect(order.feesMinor, 5000);
      expect(order.taxMinor, 18000);
      expect(order.discountMinor, 10000);
      expect(order.totalMinor, 113000);
    });
  });
}
